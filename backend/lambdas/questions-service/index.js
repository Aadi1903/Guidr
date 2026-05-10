/**
 * Guidr - Questions Service Lambda
 *
 * Handles: POST /questions, GET /questions, GET /questions/{questionId}
 * DynamoDB Table: Questions
 * Publishes to SQS when a new question is created
 */

const AWSXRay = require('aws-xray-sdk-core');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const { v4: uuidv4 } = require("uuid");

// --- AWS SDK Setup ---
const region = process.env.AWS_REGION || "us-east-1";

// Wrap clients with X-Ray for observability
const ddbClient = AWSXRay.captureAWSv3Client(new DynamoDBClient({ region }));
const ddb = DynamoDBDocumentClient.from(ddbClient);
const sqs = AWSXRay.captureAWSv3Client(new SQSClient({ region }));
const ssm = AWSXRay.captureAWSv3Client(new SSMClient({ region }));

// Variables for configuration (cached across invocations)
let QUESTIONS_TABLE = process.env.QUESTIONS_TABLE;
let SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Content-Type": "application/json",
};

const response = (statusCode, body) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(body),
});

// --- Handler ---
exports.handler = async (event) => {
  // Fetch configuration from SSM if not already cached
  if (!QUESTIONS_TABLE) {
    try {
      const data = await ssm.send(new GetParameterCommand({ Name: '/guidr/config/QUESTIONS_TABLE' }));
      QUESTIONS_TABLE = data.Parameter.Value;
      console.log(`[questions-service] Config loaded from SSM: ${QUESTIONS_TABLE}`);
    } catch (err) {
      console.warn("[questions-service] SSM fetch failed, falling back to default:", err.message);
      QUESTIONS_TABLE = "guidr-questions";
    }
  }

  // Normalize event for different API Gateway versions (REST v1.0 vs HTTP v2.0)
  const method = (event.requestContext?.http?.method || event.httpMethod || "").toUpperCase();
  const path = event.rawPath || event.path || "";
  const pathParams = event.pathParameters || {};
  const queryParams = event.queryStringParameters || {};
  const body = event.body;
  const callerId = event.requestContext?.authorizer?.claims?.sub || event.requestContext?.authorizer?.jwt?.claims?.sub;
  const callerEmail = event.requestContext?.authorizer?.claims?.email || event.requestContext?.authorizer?.jwt?.claims?.email;

  console.log(`[questions-service] ${method} ${path}`, {
    pathParams,
    queryParams,
    hasBody: !!body,
    callerId
  });

  try {
    if (method === "OPTIONS") return response(200, { message: "OK" });

    // POST /questions → create question
    if (method === "POST") {
      if (!callerId) return response(401, { error: "Unauthorized" });
      return await createQuestion(callerId, callerEmail, JSON.parse(body || "{}"));
    }

    // GET /questions/{questionId} → get single question
    if (method === "GET" && pathParams.questionId) {
      return await getQuestion(pathParams.questionId);
    }

    // GET /questions → list/search questions
    if (method === "GET") {
      return await listQuestions(queryParams);
    }

    console.log(`[questions-service] No route matched for ${method} ${path}. PathParams:`, pathParams);
    return response(404, { 
      error: "Route not found", 
      debug: { method, path, pathParams } 
    });
  } catch (err) {
    console.error("[questions-service] Error:", err);
    return response(500, { error: "Internal Server Error", details: err.message });
  }
};

// --- Create a new question ---
const createQuestion = async (authorId, authorEmail, data) => {
  const { title, body, tags } = data;

  if (!title || !body) {
    return response(400, { error: "title and body are required" });
  }

  const questionId = uuidv4();
  const createdAt = new Date().toISOString();

  const item = {
    questionId,
    authorId,
    authorEmail: authorEmail || "",
    title: title.trim(),
    body: body.trim(),
    tags: Array.isArray(tags) ? tags : [],
    answerCount: 0,
    upvotes: 0,
    createdAt,
    updatedAt: createdAt,
  };

  console.log(`[questions-service] Creating question: ${questionId}`);

  await ddb.send(new PutCommand({ TableName: QUESTIONS_TABLE, Item: item }));

  // --- Publish to SQS for async notification processing ---
  if (SQS_QUEUE_URL) {
    const sqsMessage = {
      type: "NEW_QUESTION",
      questionId,
      authorId,
      title,
      createdAt,
    };

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: SQS_QUEUE_URL,
        MessageBody: JSON.stringify(sqsMessage),
      })
    );
    console.log(`[questions-service] SQS message sent for question: ${questionId}`);
  }

  return response(201, { message: "Question created successfully", question: item });
};

// --- Get a single question ---
const getQuestion = async (questionId) => {
  console.log(`[questions-service] Getting question: ${questionId}`);

  const result = await ddb.send(
    new GetCommand({ TableName: QUESTIONS_TABLE, Key: { questionId } })
  );

  if (!result.Item) {
    return response(404, { error: "Question not found" });
  }

  return response(200, result.Item);
};

// --- List/search questions ---
const listQuestions = async (queryParams) => {
  const { tag, search, authorId, limit = "20" } = queryParams || {};

  console.log(`[questions-service] Listing questions. Filters: tag=${tag}, search=${search}`);

  let filterExpressions = [];
  let expressionValues = {};
  let expressionNames = {};

  if (tag) {
    filterExpressions.push("contains(#tags, :tag)");
    expressionValues[":tag"] = tag;
    expressionNames["#tags"] = "tags";
  }

  if (search) {
    filterExpressions.push("contains(#title, :search) OR contains(#body, :search)");
    expressionValues[":search"] = search;
    expressionNames["#title"] = "title";
    expressionNames["#body"] = "body";
  }

  if (authorId) {
    filterExpressions.push("#authorId = :authorId");
    expressionValues[":authorId"] = authorId;
    expressionNames["#authorId"] = "authorId";
  }

  const params = {
    TableName: QUESTIONS_TABLE,
    Limit: parseInt(limit, 10),
    ...(Object.keys(expressionNames).length > 0 && { ExpressionAttributeNames: expressionNames }),
    ...(filterExpressions.length > 0 && {
      FilterExpression: filterExpressions.join(" AND "),
      ExpressionAttributeValues: expressionValues,
    }),
  };

  const result = await ddb.send(new ScanCommand(params));

  // Sort by createdAt descending (newest first)
  const sorted = (result.Items || []).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return response(200, { questions: sorted, count: result.Count });
};
