/**
 * Guidr - Users Service Lambda
 * 
 * Handles: GET /users/{userId}, PUT /users/{userId}, GET /users (search professionals)
 * DynamoDB Table: Users
 * CloudWatch logging enabled via console.log (auto-captured by Lambda)
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  ScanCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

// --- AWS SDK Setup ---
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const ddb = DynamoDBDocumentClient.from(ddbClient);

const USERS_TABLE = process.env.USERS_TABLE || "guidr-users";

// --- CORS Headers (required for API Gateway + React frontend) ---
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
  "Content-Type": "application/json",
};

// --- Helper: Build HTTP response ---
const response = (statusCode, body) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(body),
});

// --- Handler ---
exports.handler = async (event) => {
  // Normalize event for different API Gateway versions (REST v1.0 vs HTTP v2.0)
  const method = (event.requestContext?.http?.method || event.httpMethod || "").toUpperCase();
  const path = event.rawPath || event.path || "";
  const pathParams = event.pathParameters || {};
  const queryParams = event.queryStringParameters || {};
  const body = event.body;
  const callerId = event.requestContext?.authorizer?.claims?.sub || event.requestContext?.authorizer?.jwt?.claims?.sub;

  console.log(`[users-service] ${method} ${path}`, {
    pathParams,
    queryParams,
    hasBody: !!body,
    callerId
  });

  try {
    // --- OPTIONS preflight ---
    if (method === "OPTIONS") {
      return response(200, { message: "OK" });
    }

    // --- GET /users  → search/list professionals ---
    // Matches if the path is exactly /users or ends with /users
    if (method === "GET" && !pathParams.userId) {
      return await listUsers(queryParams);
    }

    // --- GET /users/{userId} → get profile ---
    if (method === "GET" && pathParams.userId) {
      return await getUser(pathParams.userId);
    }

    // --- PUT /users/{userId} → update profile ---
    if (method === "PUT" && pathParams.userId) {
      // Only allow users to update their own profile
      if (callerId && callerId !== pathParams.userId) {
        return response(403, { error: "Forbidden: You can only update your own profile." });
      }
      return await updateUser(pathParams.userId, JSON.parse(body || "{}"));
    }

    console.log(`[users-service] No route matched for ${method} ${path}. PathParams:`, pathParams);
    return response(404, { 
      error: "Route not found", 
      debug: { method, path, pathParams } 
    });

  } catch (err) {
    console.error("[users-service] Unhandled error:", err);
    return response(500, { error: "Internal Server Error", details: err.message });
  }
};

// --- Get a single user by userId ---
const getUser = async (userId) => {
  console.log(`[users-service] Getting user: ${userId}`);

  const result = await ddb.send(
    new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId },
    })
  );

  if (!result.Item) {
    return response(404, { error: "User not found" });
  }

  return response(200, result.Item);
};

// --- List/search users (professionals) ---
const listUsers = async (queryParams) => {
  const { role, search } = queryParams || {};

  console.log(`[users-service] Listing users. Filters: role=${role}, search=${search}`);

  // Use scan with filter expressions (acceptable for small datasets; use GSI for scale)
  let filterExpressions = [];
  let expressionValues = {};

  if (role) {
    filterExpressions.push("#role = :role");
    expressionValues[":role"] = role;
  }

  if (search) {
    filterExpressions.push("contains(#name, :search) OR contains(#company, :search) OR contains(#college, :search)");
    expressionValues[":search"] = search;
  }

  const params = {
    TableName: USERS_TABLE,
    ...(filterExpressions.length > 0 && {
      FilterExpression: filterExpressions.join(" AND "),
      ExpressionAttributeValues: expressionValues,
      ExpressionAttributeNames: {
        "#role": "role",
        "#name": "name",
        "#company": "company",
        "#college": "college",
      },
    }),
    Limit: 50,
  };

  const result = await ddb.send(new ScanCommand(params));

  return response(200, {
    users: result.Items || [],
    count: result.Count,
  });
};

// --- Update user profile ---
const updateUser = async (userId, data) => {
  console.log(`[users-service] Updating user: ${userId}`, data);

  // Allowed fields to update
  const allowedFields = [
    "name", "college", "company", "role", "experience",
    "skills", "bio", "profileImageUrl", "linkedinUrl",
  ];

  const updateParts = [];
  const expressionValues = {};
  const expressionNames = {};

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      updateParts.push(`#${field} = :${field}`);
      expressionValues[`:${field}`] = data[field];
      expressionNames[`#${field}`] = field;
    }
  });

  if (updateParts.length === 0) {
    return response(400, { error: "No valid fields to update" });
  }

  // Always update the updatedAt timestamp
  updateParts.push("#updatedAt = :updatedAt");
  expressionValues[":updatedAt"] = new Date().toISOString();
  expressionNames["#updatedAt"] = "updatedAt";

  await ddb.send(
    new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: `SET ${updateParts.join(", ")}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ConditionExpression: "attribute_exists(userId)", // Ensure user exists
    })
  );

  return response(200, { message: "Profile updated successfully", userId });
};
