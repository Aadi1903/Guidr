#!/bin/bash
# =============================================================================
# Guidr - Lambda Deployment Script
# =============================================================================
# Deploys all Lambda functions and creates API Gateway routes.
#
# Prerequisites:
#   - setup-aws.sh must have been run first
#   - Node.js 18+ installed
#
# Usage:
#   chmod +x deploy-lambdas.sh
#   ./deploy-lambdas.sh
# =============================================================================

set -e

REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
LAMBDA_ROLE_ARN=$(aws iam get-role --role-name guidr-lambda-role --query 'Role.Arn' --output text)

SQS_QUEUE_URL=$(aws sqs get-queue-url --queue-name guidr-notifications-queue --query 'QueueUrl' --output text --region $REGION)
SQS_QUEUE_ARN=$(aws sqs get-queue-attributes --queue-url $SQS_QUEUE_URL --attribute-names QueueArn --query 'Attributes.QueueArn' --output text --region $REGION)
SNS_TOPIC_ARN=$(aws sns list-topics --region $REGION --query "Topics[?contains(TopicArn,'guidr-notifications-topic')].TopicArn" --output text)

FRONTEND_URL="*"  # Replace with your CloudFront URL after deployment

echo "=================================================="
echo "  Guidr Lambda Deployment"
echo "  Region: $REGION | Account: $ACCOUNT_ID"
echo "=================================================="

# ── Helper: zip, deploy or update Lambda ──────────────────────────────────────
deploy_lambda() {
  local NAME=$1
  local DIR=$2
  local HANDLER=$3
  local VARS=$4

  echo ""
  echo "▶ Deploying $NAME..."

  cd $DIR
  npm install --omit=dev --silent
  zip -r /tmp/${NAME}.zip . -x "*.git*" > /dev/null
  cd -

  # Check if function exists
  if aws lambda get-function --function-name $NAME --region $REGION > /dev/null 2>&1; then
    # Update existing
    aws lambda update-function-code \
      --function-name $NAME \
      --zip-file fileb:///tmp/${NAME}.zip \
      --region $REGION > /dev/null

    aws lambda update-function-configuration \
      --function-name $NAME \
      --environment "Variables={$VARS}" \
      --region $REGION > /dev/null

    echo "  ✓ $NAME updated"
  else
    # Create new
    aws lambda create-function \
      --function-name $NAME \
      --runtime nodejs18.x \
      --role $LAMBDA_ROLE_ARN \
      --handler $HANDLER \
      --zip-file fileb:///tmp/${NAME}.zip \
      --timeout 30 \
      --memory-size 256 \
      --environment "Variables={$VARS}" \
      --region $REGION > /dev/null

    echo "  ✓ $NAME created"
  fi
}

LAMBDA_DIR="$(dirname "$0")/../backend/lambdas"

# Common environment variables for all Lambdas
COMMON_VARS="AWS_REGION=$REGION,USERS_TABLE=guidr-users,QUESTIONS_TABLE=guidr-questions,ANSWERS_TABLE=guidr-answers,FRONTEND_URL=$FRONTEND_URL"

# Deploy each microservice
deploy_lambda \
  "guidr-auth-service" \
  "$LAMBDA_DIR/auth-service" \
  "index.handler" \
  "$COMMON_VARS"

deploy_lambda \
  "guidr-users-service" \
  "$LAMBDA_DIR/users-service" \
  "index.handler" \
  "$COMMON_VARS"

deploy_lambda \
  "guidr-questions-service" \
  "$LAMBDA_DIR/questions-service" \
  "index.handler" \
  "$COMMON_VARS,SQS_QUEUE_URL=$SQS_QUEUE_URL"

deploy_lambda \
  "guidr-answers-service" \
  "$LAMBDA_DIR/answers-service" \
  "index.handler" \
  "$COMMON_VARS,SQS_QUEUE_URL=$SQS_QUEUE_URL"

deploy_lambda \
  "guidr-notification-worker" \
  "$LAMBDA_DIR/notification-worker" \
  "index.handler" \
  "AWS_REGION=$REGION,SNS_TOPIC_ARN=$SNS_TOPIC_ARN,SES_FROM_EMAIL=noreply@guidr.app,FRONTEND_URL=$FRONTEND_URL"

# ── SQS Trigger for Notification Worker ──────────────────────────────────────
echo ""
echo "▶ Configuring SQS trigger for notification-worker..."

aws lambda create-event-source-mapping \
  --function-name guidr-notification-worker \
  --event-source-arn $SQS_QUEUE_ARN \
  --batch-size 5 \
  --region $REGION 2>/dev/null && echo "  ✓ SQS trigger configured" || echo "  ⚠ SQS trigger already exists"

# ── Create API Gateway ────────────────────────────────────────────────────────
echo ""
echo "▶ Creating API Gateway..."

API_ID=$(aws apigateway create-rest-api \
  --name guidr-api \
  --description "Guidr Career Mentorship Platform API" \
  --endpoint-configuration types=REGIONAL \
  --region $REGION \
  --query 'id' --output text 2>/dev/null || \
  aws apigateway get-rest-apis --region $REGION --query "items[?name=='guidr-api'].id" --output text | head -1)

echo "  ✓ API Gateway ID: $API_ID"

ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?path==`/`].id' --output text)

# ── Helper: Get or create Cognito Authorizer for API Gateway ──────────────────
get_or_create_authorizer() {
  local API_ID=$1
  
  # 1. Get User Pool ID and ARN
  local POOL_ID=$(aws cognito-idp list-user-pools --region $REGION --query "UserPools[?Name=='guidr-user-pool'].Id" --output text | head -1)
  local POOL_ARN="arn:aws:cognito-idp:$REGION:$ACCOUNT_ID:userpool/$POOL_ID"
  
  # 2. Check if authorizer already exists
  local AUTH_ID=$(aws apigateway get-authorizers --rest-api-id $API_ID --region $REGION --query "items[?name=='guidr-cognito-authorizer'].id" --output text | head -1)
  
  if [ -z "$AUTH_ID" ] || [ "$AUTH_ID" == "None" ]; then
    echo "  Creating API Authorizer..." >&2
    AUTH_ID=$(aws apigateway create-authorizer \
      --rest-api-id $API_ID \
      --name guidr-cognito-authorizer \
      --type COGNITO_USER_POOLS \
      --provider-arns "$POOL_ARN" \
      --identity-source "method.request.header.Authorization" \
      --region $REGION \
      --query 'id' --output text)
  fi
  
  echo "$AUTH_ID"
}

# ── Helper: create API Gateway resource + Lambda integration ──────────────────
create_route() {
  local PATH_PART=$1
  local LAMBDA_NAME=$2
  local PARENT_ID=$3

  RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $PARENT_ID \
    --path-part $PATH_PART \
    --region $REGION \
    --query 'id' --output text 2>/dev/null)

  LAMBDA_ARN="arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$LAMBDA_NAME"

  # Add ANY method
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method ANY \
    --authorization-type COGNITO_USER_POOLS \
    --authorizer-id $(get_or_create_authorizer $API_ID) \
    --region $REGION > /dev/null 2>&1 || true

  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method ANY \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
    --region $REGION > /dev/null 2>&1 || true

  # Grant API Gateway permission to invoke Lambda
  aws lambda add-permission \
    --function-name $LAMBDA_NAME \
    --statement-id "apigateway-${PATH_PART}-$(date +%s)" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*" \
    --region $REGION > /dev/null 2>&1 || true

  echo "  ✓ Route /$PATH_PART → $LAMBDA_NAME"
  echo $RESOURCE_ID
}

echo ""
echo "▶ Mapping API routes..."

AUTH_ID=$(create_route "auth" "guidr-auth-service" $ROOT_ID)
USERS_ID=$(create_route "users" "guidr-users-service" $ROOT_ID)
QUESTIONS_ID=$(create_route "questions" "guidr-questions-service" $ROOT_ID)
ANSWERS_ID=$(create_route "answers" "guidr-answers-service" $ROOT_ID)

# Deploy API to 'prod' stage
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --stage-description "Production" \
  --description "Guidr API deployment" \
  --region $REGION > /dev/null

API_URL="https://$API_ID.execute-api.$REGION.amazonaws.com/prod"

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✅ Lambda Deployment Complete!"
echo "══════════════════════════════════════════════════"
echo ""
echo "  API Gateway URL: $API_URL"
echo ""
echo "  Endpoints:"
echo "    GET/POST  $API_URL/auth"
echo "    GET/PUT   $API_URL/users/{userId}"
echo "    GET/POST  $API_URL/questions"
echo "    GET/POST  $API_URL/answers"
echo "    PUT       $API_URL/answers/{answerId}/upvote"
echo ""
echo "  ⚠ Update frontend/.env with:"
echo "    VITE_API_URL=$API_URL"
echo ""
echo "Next step: Run ./deploy-frontend.sh"
