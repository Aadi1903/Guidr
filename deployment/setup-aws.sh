#!/bin/bash
# =============================================================================
# Guidr - AWS Infrastructure Setup Script
# =============================================================================
# Run this ONCE to create all required AWS resources.
# Prerequisites:
#   - AWS CLI installed and configured (aws configure)
#   - Appropriate IAM permissions
#
# Usage:
#   chmod +x setup-aws.sh
#   ./setup-aws.sh
# =============================================================================

set -e  # Exit on any error

# ── Configuration ─────────────────────────────────────────────────────────────
REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
APP_NAME="guidr"

echo "=================================================="
echo "  Guidr AWS Infrastructure Setup"
echo "  Region: $REGION | Account: $ACCOUNT_ID"
echo "=================================================="

# ══════════════════════════════════════════════════════════════════════════════
# STEP 1: Create DynamoDB Tables
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "▶ [1/8] Creating DynamoDB Tables..."

# Users Table
aws dynamodb create-table \
  --table-name guidr-users \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=email,AttributeType=S \
    AttributeName=role,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    '[
      {
        "IndexName":"email-index",
        "KeySchema":[{"AttributeName":"email","KeyType":"HASH"}],
        "Projection":{"ProjectionType":"ALL"}
      },
      {
        "IndexName":"role-index",
        "KeySchema":[{"AttributeName":"role","KeyType":"HASH"}],
        "Projection":{"ProjectionType":"ALL"}
      }
    ]' \
  --region $REGION 2>/dev/null && echo "  ✓ guidr-users table created" || echo "  ⚠ guidr-users already exists"

# Questions Table
aws dynamodb create-table \
  --table-name guidr-questions \
  --attribute-definitions \
    AttributeName=questionId,AttributeType=S \
    AttributeName=authorId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema AttributeName=questionId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    '[
      {
        "IndexName":"authorId-createdAt-index",
        "KeySchema":[
          {"AttributeName":"authorId","KeyType":"HASH"},
          {"AttributeName":"createdAt","KeyType":"RANGE"}
        ],
        "Projection":{"ProjectionType":"ALL"}
      }
    ]' \
  --region $REGION 2>/dev/null && echo "  ✓ guidr-questions table created" || echo "  ⚠ guidr-questions already exists"

# Answers Table
aws dynamodb create-table \
  --table-name guidr-answers \
  --attribute-definitions \
    AttributeName=answerId,AttributeType=S \
    AttributeName=questionId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema AttributeName=answerId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    '[
      {
        "IndexName":"questionId-createdAt-index",
        "KeySchema":[
          {"AttributeName":"questionId","KeyType":"HASH"},
          {"AttributeName":"createdAt","KeyType":"RANGE"}
        ],
        "Projection":{"ProjectionType":"ALL"}
      }
    ]' \
  --region $REGION 2>/dev/null && echo "  ✓ guidr-answers table created" || echo "  ⚠ guidr-answers already exists"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 2: Create Cognito User Pool
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "▶ [2/8] Creating Cognito User Pool..."

USER_POOL_ID=$(aws cognito-idp list-user-pools --region $REGION --query "UserPools[?Name=='guidr-user-pool'].Id" --output text | head -1)

if [ -z "$USER_POOL_ID" ]; then
  USER_POOL_ID=$(aws cognito-idp create-user-pool \
    --pool-name guidr-user-pool \
    --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":true,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":false}}' \
    --auto-verified-attributes email \
    --username-attributes email \
    --schema \
      '[
        {"Name":"email","Required":true,"Mutable":true},
        {"Name":"name","Required":false,"Mutable":true},
        {"Name":"role","AttributeDataType":"String","Required":false,"Mutable":true}
      ]' \
    --region $REGION \
    --query 'UserPool.Id' --output text)
  echo "  ✓ User Pool created: $USER_POOL_ID"
else
  echo "  ⚠ User Pool already exists: $USER_POOL_ID"
fi

# Create App Client (no secret — for React SPA)
APP_CLIENT_ID=$(aws cognito-idp list-user-pool-clients --user-pool-id $USER_POOL_ID --region $REGION --query "UserPoolClients[?ClientName=='guidr-web-client'].ClientId" --output text | head -1)

if [ -z "$APP_CLIENT_ID" ]; then
  APP_CLIENT_ID=$(aws cognito-idp create-user-pool-client \
    --user-pool-id $USER_POOL_ID \
    --client-name guidr-web-client \
    --no-generate-secret \
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --region $REGION \
    --query 'UserPoolClient.ClientId' --output text)
  echo "  ✓ App Client created: $APP_CLIENT_ID"
else
  echo "  ⚠ App Client already exists: $APP_CLIENT_ID"
fi
echo "  ⚠ SAVE THESE VALUES:"
echo "     VITE_COGNITO_USER_POOL_ID=$USER_POOL_ID"
echo "     VITE_COGNITO_CLIENT_ID=$APP_CLIENT_ID"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 3: Create SQS Queue
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "▶ [3/8] Creating SQS Queue..."

SQS_QUEUE_URL=$(aws sqs create-queue \
  --queue-name guidr-notifications-queue \
  --attributes \
    VisibilityTimeout=60 \
    MessageRetentionPeriod=86400 \
  --region $REGION \
  --query 'QueueUrl' --output text)

SQS_QUEUE_ARN=$(aws sqs get-queue-attributes \
  --queue-url $SQS_QUEUE_URL \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' --output text \
  --region $REGION)

echo "  ✓ SQS Queue created: $SQS_QUEUE_URL"
echo "  ✓ Queue ARN: $SQS_QUEUE_ARN"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 4: Create SNS Topic
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "▶ [4/8] Creating SNS Topic..."

SNS_TOPIC_ARN=$(aws sns list-topics --region $REGION --query "Topics[?contains(TopicArn,':guidr-notifications-topic')].TopicArn" --output text | head -1)

if [ -z "$SNS_TOPIC_ARN" ]; then
  SNS_TOPIC_ARN=$(aws sns create-topic \
    --name guidr-notifications-topic \
    --region $REGION \
    --query 'TopicArn' --output text)
  echo "  ✓ SNS Topic created: $SNS_TOPIC_ARN"
else
  echo "  ⚠ SNS Topic already exists: $SNS_TOPIC_ARN"
fi
echo "  ⚠ SAVE THIS VALUE: SNS_TOPIC_ARN=$SNS_TOPIC_ARN"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 5: Create S3 Bucket for Frontend
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "▶ [5/8] Creating S3 Bucket for Frontend..."

BUCKET_NAME="guidr-frontend-$ACCOUNT_ID"

aws s3api create-bucket \
  --bucket $BUCKET_NAME \
  --region $REGION 2>/dev/null && echo "  ✓ S3 bucket created: $BUCKET_NAME" || echo "  ⚠ Bucket already exists"

# Enable static website hosting
aws s3 website s3://$BUCKET_NAME/ \
  --index-document index.html \
  --error-document index.html

# Disable block public access (required for CloudFront OAC or direct hosting)
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
    BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false

echo "  ✓ S3 bucket configured for static hosting"
echo "  ⚠ SAVE THIS VALUE: S3_BUCKET=$BUCKET_NAME"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 6: Create IAM Role for Lambda
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "▶ [6/8] Creating IAM Role for Lambda..."

TRUST_POLICY='{
  "Version":"2012-10-17",
  "Statement":[{
    "Effect":"Allow",
    "Principal":{"Service":"lambda.amazonaws.com"},
    "Action":"sts:AssumeRole"
  }]
}'

LAMBDA_ROLE_ARN=$(aws iam create-role \
  --role-name guidr-lambda-role \
  --assume-role-policy-document "$TRUST_POLICY" \
  --query 'Role.Arn' --output text 2>/dev/null || \
  aws iam get-role --role-name guidr-lambda-role --query 'Role.Arn' --output text)

echo "  ✓ Lambda role: $LAMBDA_ROLE_ARN"

# Attach managed policies
POLICIES=(
  "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
  "arn:aws:iam::aws:policy/AmazonSQSFullAccess"
  "arn:aws:iam::aws:policy/AmazonSNSFullAccess"
  "arn:aws:iam::aws:policy/AmazonSESFullAccess"
  "arn:aws:iam::aws:policy/AmazonS3FullAccess"
)

for POLICY in "${POLICIES[@]}"; do
  aws iam attach-role-policy --role-name guidr-lambda-role --policy-arn "$POLICY" 2>/dev/null
  echo "  ✓ Attached: $POLICY"
done

echo "  ⚠ SAVE THIS VALUE: LAMBDA_ROLE_ARN=$LAMBDA_ROLE_ARN"

sleep 10  # Wait for IAM propagation

# ══════════════════════════════════════════════════════════════════════════════
# STEP 7: Verify SES Sender Email
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "▶ [7/8] SES Email Verification..."
echo "  ⚠ You must verify your sender email in SES before sending emails."
echo "  Run: aws ses verify-email-identity --email-address noreply@yourdomain.com --region $REGION"
echo "  Or use the SES console: https://console.aws.amazon.com/ses/home"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 8: Output Summary
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "══════════════════════════════════════════════════"
echo "  ✅ Infrastructure Setup Complete!"
echo "══════════════════════════════════════════════════"
echo ""
echo "Save these values in your .env file:"
echo "  REGION=$REGION"
echo "  USERS_TABLE=guidr-users"
echo "  QUESTIONS_TABLE=guidr-questions"
echo "  ANSWERS_TABLE=guidr-answers"
echo "  COGNITO_USER_POOL_ID=$USER_POOL_ID"
echo "  COGNITO_CLIENT_ID=$APP_CLIENT_ID"
echo "  SQS_QUEUE_URL=$SQS_QUEUE_URL"
echo "  SQS_QUEUE_ARN=$SQS_QUEUE_ARN"
echo "  SNS_TOPIC_ARN=$SNS_TOPIC_ARN"
echo "  S3_BUCKET=$BUCKET_NAME"
echo "  LAMBDA_ROLE_ARN=$LAMBDA_ROLE_ARN"
echo ""
echo "Next step: Run ./deploy-lambdas.sh"
