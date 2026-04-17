#!/bin/bash
# =============================================================================
# Guidr - Fast Lambda Code Update
# =============================================================================
# Run this to quickly update your Lambda functions with local changes.
# =============================================================================

set -e

REGION="us-east-1"
LAMBDA_DIR="./backend/lambdas"

update_lambda() {
  local NAME=$1
  local ZIP=$2
  
  echo "▶ Updating $NAME..."
  aws lambda update-function-code \
    --function-name $NAME \
    --zip-file fileb://$ZIP \
    --region $REGION > /dev/null
  echo "  ✓ $NAME updated"
}

echo "=================================================="
echo "  Guidr - Updating Lambda Code"
echo "=================================================="

update_lambda "guidr-users-service" "$LAMBDA_DIR/users.zip"
update_lambda "guidr-auth-service" "$LAMBDA_DIR/auth.zip"
update_lambda "guidr-questions-service" "$LAMBDA_DIR/questions.zip"
update_lambda "guidr-answers-service" "$LAMBDA_DIR/answers.zip"

echo ""
echo "✅ All Lambdas updated successfully!"
