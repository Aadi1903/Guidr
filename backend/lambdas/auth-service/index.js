/**
 * Guidr - Auth Service Lambda
 *
 * This Lambda acts as a Cognito Post-Confirmation Trigger.
 * Triggered automatically by Cognito when a user confirms their account.
 *
 * Flow:
 *   User signs up in Cognito → Confirms email → Cognito triggers this Lambda
 *   → Lambda creates a profile record in DynamoDB Users table
 *
 * Also handles:
 *   GET /auth/me   → Returns the current user profile from DynamoDB
 *   POST /auth/profile → Create profile (manual, for first-time users)
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");

const region = process.env.AWS_REGION || "us-east-1";
const ddbClient = new DynamoDBClient({ region });
const ddb = DynamoDBDocumentClient.from(ddbClient);

const USERS_TABLE = process.env.USERS_TABLE || "guidr-users";

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

exports.handler = async (event) => {
  console.log("[auth-service] Event:", JSON.stringify(event, null, 2));

  // ======================================================
  // Case 1: Cognito Post-Confirmation Trigger
  // Cognito sends a specific event shape — not an HTTP event
  // ======================================================
  if (event.triggerSource === "PostConfirmation_ConfirmSignUp") {
    return await handlePostConfirmation(event);
  }

  // ======================================================
  // Case 2: API Gateway HTTP request
  // ======================================================
  // Normalize event for different API Gateway versions (REST v1.0 vs HTTP v2.0)
  const method = (event.requestContext?.http?.method || event.httpMethod || "").toUpperCase();
  const path = event.rawPath || event.path || "";
  const pathParams = event.pathParameters || {};
  const queryParams = event.queryStringParameters || {};
  const body = event.body;
  
  // Extract caller identity from either Cognito (REST) or JWT (HTTP) authorizers
  const claims = event.requestContext?.authorizer?.claims || event.requestContext?.authorizer?.jwt?.claims;
  const callerId = claims?.sub;

  console.log(`[auth-service] ${method} ${path}`, {
    pathParams,
    queryParams,
    hasBody: !!body,
    callerId
  });

  try {
    if (method === "OPTIONS") return response(200, { message: "OK" });

    // GET /auth/me → return current user's profile
    if (method === "GET") {
      if (!callerId) return response(401, { error: "Unauthorized" });
      return await getMyProfile(callerId);
    }

    // POST /auth/profile → create/initialize profile
    if (method === "POST") {
      if (!callerId) return response(401, { error: "Unauthorized" });
      return await createProfile(callerId, claims, JSON.parse(body || "{}"));
    }

    console.log(`[auth-service] No route matched for ${method} ${path}. PathParams:`, pathParams);
    return response(404, { 
      error: "Route not found", 
      debug: { method, path, pathParams } 
    });
  } catch (err) {
    console.error("[auth-service] Error:", err);
    return response(500, { error: "Internal Server Error", details: err.message });
  }
};

// --- Cognito Post-Confirmation: Create initial profile ---
const handlePostConfirmation = async (event) => {
  const { sub, email, "custom:role": role, name } = event.request.userAttributes;

  console.log(`[auth-service] Post-confirmation for user: ${sub}, role: ${role}`);

  const now = new Date().toISOString();

  const item = {
    userId: sub,
    email,
    name: name || email.split("@")[0],
    role: role || "student",
    college: "",
    company: "",
    skills: "",
    experience: "",
    bio: "",
    profileImageUrl: "",
    linkedinUrl: "",
    createdAt: now,
    updatedAt: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: USERS_TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(userId)", // Don't overwrite if exists
    })
  );

  console.log(`[auth-service] Profile created for user: ${sub}`);

  // Must return the original event object back to Cognito
  return event;
};

// --- Get my profile ---
const getMyProfile = async (userId) => {
  const result = await ddb.send(
    new GetCommand({ TableName: USERS_TABLE, Key: { userId } })
  );

  if (!result.Item) {
    return response(404, { error: "Profile not found. Please complete signup." });
  }

  return response(200, result.Item);
};

// --- Create profile (fallback for users who bypass post-confirmation) ---
const createProfile = async (userId, claims, data) => {
  const { email } = claims || {};
  const { name, role, college, company, skills, experience, bio } = data;

  // Check if profile already exists
  const existing = await ddb.send(
    new GetCommand({ TableName: USERS_TABLE, Key: { userId } })
  );

  if (existing.Item) {
    return response(200, { message: "Profile already exists", profile: existing.Item });
  }

  const now = new Date().toISOString();

  const item = {
    userId,
    email: email || "",
    name: name || "",
    role: role || "student",
    college: college || "",
    company: company || "",
    skills: skills || "",
    experience: experience || "",
    bio: bio || "",
    profileImageUrl: "",
    linkedinUrl: "",
    createdAt: now,
    updatedAt: now,
  };

  await ddb.send(new PutCommand({ TableName: USERS_TABLE, Item: item }));

  return response(201, { message: "Profile created", profile: item });
};
