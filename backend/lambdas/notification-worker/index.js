/**
 * Guidr - Notification Worker Lambda
 *
 * Triggered by: SQS queue (guidr-notifications-queue)
 * Processes: NEW_ANSWER, NEW_QUESTION events
 * Action: Publishes SNS notification → SNS triggers SES email
 *
 * This is an EVENT-DRIVEN microservice — no API Gateway route.
 * SQS → Lambda → SNS → SES (email)
 */

const AWSXRay = require('aws-xray-sdk-core');
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");

const region = process.env.AWS_REGION || "us-east-1";

// Wrap clients with X-Ray for observability
const sns = AWSXRay.captureAWSv3Client(new SNSClient({ region }));
const ses = AWSXRay.captureAWSv3Client(new SESClient({ region }));
const ssm = AWSXRay.captureAWSv3Client(new SSMClient({ region }));

// Variables for configuration (cached across invocations)
let SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;
let SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || "noreply@guidr.app";

// --- Main Handler: triggered by SQS ---
exports.handler = async (event) => {
  // Fetch configuration from SSM if SNS_TOPIC_ARN is missing
  if (!SNS_TOPIC_ARN) {
    try {
      const data = await ssm.send(new GetParameterCommand({ Name: '/guidr/config/SNS_TOPIC_ARN' }));
      SNS_TOPIC_ARN = data.Parameter.Value;
      console.log(`[notification-worker] Config loaded from SSM: ${SNS_TOPIC_ARN}`);
    } catch (err) {
      console.warn("[notification-worker] SSM fetch failed for SNS_TOPIC_ARN:", err.message);
    }
  }

  console.log("[notification-worker] SQS Event:", JSON.stringify(event, null, 2));

  const results = [];

  // SQS sends records in batches
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      console.log(`[notification-worker] Processing message type: ${message.type}`);

      switch (message.type) {
        case "NEW_ANSWER":
          await handleNewAnswer(message);
          break;

        case "NEW_QUESTION":
          await handleNewQuestion(message);
          break;

        default:
          console.warn(`[notification-worker] Unknown message type: ${message.type}`);
      }

      results.push({ messageId: record.messageId, status: "processed" });
    } catch (err) {
      console.error(`[notification-worker] Error processing record ${record.messageId}:`, err);
      // Re-throw to let SQS handle retry/DLQ
      throw err;
    }
  }

  console.log("[notification-worker] Processed records:", results);
  return { batchItemFailures: [] };
};

// --- Handle "Question Answered" notification ---
const handleNewAnswer = async (message) => {
  const { questionId, questionTitle, questionAuthorEmail, answererEmail, createdAt } = message;

  if (!questionAuthorEmail) {
    console.warn("[notification-worker] No email for question author, skipping.");
    return;
  }

  const subject = `Your question got an answer on Guidr! 🎉`;
  const htmlBody = `
    <html>
      <body style="font-family: Arial, sans-serif; background: #0f0f1a; color: #e0e0e0; padding: 40px;">
        <div style="max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 12px; padding: 32px;">
          <h1 style="color: #7c3aed;">Guidr 🎓</h1>
          <h2 style="color: #a78bfa;">Your question has a new answer!</h2>
          <p style="color: #c4b5fd;">
            Someone answered your question: <strong>${questionTitle}</strong>
          </p>
          <a href="${process.env.FRONTEND_URL || 'https://your-cloudfront-url.com'}/question/${questionId}"
             style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: white; 
                    border-radius: 8px; text-decoration: none; margin-top: 16px;">
            View Answer →
          </a>
          <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">
            Posted by ${answererEmail} on ${new Date(createdAt).toLocaleDateString()}
          </p>
        </div>
      </body>
    </html>
  `;

  // 1. Publish to SNS (for fan-out if needed)
  if (SNS_TOPIC_ARN) {
    await sns.send(
      new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Message: JSON.stringify({
          type: "NEW_ANSWER",
          questionId,
          questionTitle,
          recipientEmail: questionAuthorEmail,
        }),
        Subject: subject,
        MessageAttributes: {
          notificationType: {
            DataType: "String",
            StringValue: "NEW_ANSWER",
          },
        },
      })
    );
    console.log(`[notification-worker] SNS published for question: ${questionId}`);
  }

  // 2. Send direct email via SES
  await sendEmail(questionAuthorEmail, subject, htmlBody);
};

// --- Handle "New Question Posted" notification (e.g., notify professionals) ---
const handleNewQuestion = async (message) => {
  const { questionId, title, authorId, createdAt } = message;

  console.log(`[notification-worker] New question posted: ${questionId} - ${title}`);

  // Publish to SNS topic — subscribers (professionals) will be notified
  if (SNS_TOPIC_ARN) {
    await sns.send(
      new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Message: JSON.stringify({
          type: "NEW_QUESTION",
          questionId,
          title,
          authorId,
          createdAt,
        }),
        Subject: `New question on Guidr: ${title}`,
      })
    );
    console.log(`[notification-worker] SNS published for new question: ${questionId}`);
  }
};

// --- SES Email Sender ---
const sendEmail = async (toEmail, subject, htmlBody) => {
  try {
    await ses.send(
      new SendEmailCommand({
        Source: SES_FROM_EMAIL,
        Destination: { ToAddresses: [toEmail] },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: htmlBody, Charset: "UTF-8" },
            Text: {
              Data: subject, // Plain text fallback
              Charset: "UTF-8",
            },
          },
        },
      })
    );
    console.log(`[notification-worker] SES email sent to: ${toEmail}`);
  } catch (err) {
    // Log but don't fail — email sending should not block notification processing
    console.error(`[notification-worker] SES email failed to ${toEmail}:`, err.message);
  }
};
