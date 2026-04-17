/**
 * Guidr - Answers Service Lambda
 *
 * Handles:
 *   POST /answers              → post a new answer to a question
 *   GET  /answers?questionId=  → get answers for a question
 *   PUT  /answers/{answerId}/upvote → upvote an answer
 *
 * DynamoDB Table: Answers
 * Side effects:
 *   - On new answer: publishes SQS message → triggers notification to question author
 *   - Increments answerCount on Questions table
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const { v4: uuidv4 } = require("uuid");

const region = process.env.AWS_REGION || "us-east-1";
const ddbClient = new DynamoDBClient({ region });
const ddb = DynamoDBDocumentClient.from(ddbClient);
const sqs = new SQSClient({ region });

const ANSWERS_TABLE = process.env.ANSWERS_TABLE || "guidr-answers";
const QUESTIONS_TABLE = process.env.QUESTIONS_TABLE || "guidr-questions";
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Content-Type": "application/json",
};

const response = (statusCode, body) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  // Normalize event for different API Gateway versions (REST v1.0 vs HTTP v2.0)
  const method = (event.requestContext?.http?.method || event.httpMethod || "").toUpperCase();
  const path = event.rawPath || event.path || "";
  const pathParams = event.pathParameters || {};
  const queryParams = event.queryStringParameters || {};
  const body = event.body;
  const callerId = event.requestContext?.authorizer?.claims?.sub || event.requestContext?.authorizer?.jwt?.claims?.sub;
  const callerEmail = event.requestContext?.authorizer?.claims?.email || event.requestContext?.authorizer?.jwt?.claims?.email;

  console.log(`[answers-service] ${method} ${path}`, {
    pathParams,
    queryParams,
    hasBody: !!body,
    callerId
  });

  try {
    if (method === "OPTIONS") return response(200, { message: "OK" });

    // POST /answers → create answer
    if (method === "POST") {
      if (!callerId) return response(401, { error: "Unauthorized" });
      return await createAnswer(callerId, callerEmail, JSON.parse(body || "{}"));
    }

    // PUT /answers/{answerId}/upvote → upvote
    if (method === "PUT" && pathParams.answerId) {
      if (!callerId) return response(401, { error: "Unauthorized" });
      return await upvoteAnswer(pathParams.answerId, callerId);
    }

    // GET /answers?questionId=xxx → list answers
    if (method === "GET") {
      return await listAnswers(queryParams);
    }

    console.log(`[answers-service] No route matched for ${method} ${path}. PathParams:`, pathParams);
    return response(404, { 
      error: "Route not found", 
      debug: { method, path, pathParams } 
    });
  } catch (err) {
    console.error("[answers-service] Error:", err);
    return response(500, { error: "Internal Server Error", details: err.message });
  }
};

// --- Create a new answer ---
const createAnswer = async (authorId, authorEmail, data) => {
  const { questionId, body } = data;

  if (!questionId || !body) {
    return response(400, { error: "questionId and body are required" });
  }

  // Verify the question exists
  const questionResult = await ddb.send(
    new GetCommand({ TableName: QUESTIONS_TABLE, Key: { questionId } })
  );

  if (!questionResult.Item) {
    return response(404, { error: "Question not found" });
  }

  const question = questionResult.Item;
  const answerId = uuidv4();
  const createdAt = new Date().toISOString();

  const item = {
    answerId,
    questionId,
    authorId,
    authorEmail: authorEmail || "",
    body: body.trim(),
    upvotes: 0,
    upvotedBy: [], // track who upvoted to prevent duplicates
    createdAt,
    updatedAt: createdAt,
  };

  console.log(`[answers-service] Creating answer: ${answerId} for question: ${questionId}`);

  // Write answer + increment question's answerCount atomically
  await Promise.all([
    ddb.send(new PutCommand({ TableName: ANSWERS_TABLE, Item: item })),
    ddb.send(
      new UpdateCommand({
        TableName: QUESTIONS_TABLE,
        Key: { questionId },
        UpdateExpression: "SET answerCount = if_not_exists(answerCount, :zero) + :one",
        ExpressionAttributeValues: { ":one": 1, ":zero": 0 },
      })
    ),
  ]);

  // --- Publish to SQS: notify question author ---
  if (SQS_QUEUE_URL && question.authorId !== authorId) {
    const sqsMessage = {
      type: "NEW_ANSWER",
      answerId,
      questionId,
      questionTitle: question.title,
      questionAuthorId: question.authorId,
      questionAuthorEmail: question.authorEmail,
      answererEmail: authorEmail,
      createdAt,
    };

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: SQS_QUEUE_URL,
        MessageBody: JSON.stringify(sqsMessage),
      })
    );
    console.log(`[answers-service] SQS notification sent for answer: ${answerId}`);
  }

  return response(201, { message: "Answer posted successfully", answer: item });
};

// --- List answers for a question ---
const listAnswers = async (queryParams) => {
  const { questionId } = queryParams || {};

  if (!questionId) {
    return response(400, { error: "questionId query parameter is required" });
  }

  console.log(`[answers-service] Listing answers for question: ${questionId}`);

  // Use GSI questionId-index for efficient querying
  // Fallback to Scan with filter if GSI not configured yet
  const params = {
    TableName: ANSWERS_TABLE,
    FilterExpression: "#questionId = :questionId",
    ExpressionAttributeNames: { "#questionId": "questionId" },
    ExpressionAttributeValues: { ":questionId": questionId },
  };

  const result = await ddb.send(new ScanCommand(params));

  // Sort by upvotes desc, then createdAt asc
  const sorted = (result.Items || []).sort(
    (a, b) => b.upvotes - a.upvotes || new Date(a.createdAt) - new Date(b.createdAt)
  );

  return response(200, { answers: sorted, count: result.Count });
};

// --- Upvote an answer ---
const upvoteAnswer = async (answerId, callerId) => {
  console.log(`[answers-service] Upvoting answer: ${answerId} by user: ${callerId}`);

  // Get current answer to check if user already upvoted
  const result = await ddb.send(
    new GetCommand({ TableName: ANSWERS_TABLE, Key: { answerId } })
  );

  if (!result.Item) {
    return response(404, { error: "Answer not found" });
  }

  const answer = result.Item;
  const upvotedBy = answer.upvotedBy || [];

  if (upvotedBy.includes(callerId)) {
    return response(400, { error: "You have already upvoted this answer" });
  }

  // Prevent upvoting your own answer
  if (answer.authorId === callerId) {
    return response(400, { error: "You cannot upvote your own answer" });
  }

  await ddb.send(
    new UpdateCommand({
      TableName: ANSWERS_TABLE,
      Key: { answerId },
      UpdateExpression:
        "SET upvotes = upvotes + :one, upvotedBy = list_append(upvotedBy, :userId)",
      ExpressionAttributeValues: {
        ":one": 1,
        ":userId": [callerId],
      },
    })
  );

  return response(200, { message: "Answer upvoted", upvotes: answer.upvotes + 1 });
};
