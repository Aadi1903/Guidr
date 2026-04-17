#!/bin/bash
# =============================================================================
# Guidr - Frontend Deployment Script (S3 + CloudFront)
# =============================================================================
# Usage:
#   chmod +x deploy-frontend.sh
#   ./deploy-frontend.sh
# =============================================================================

set -e

REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="guidr-frontend-$ACCOUNT_ID"
FRONTEND_DIR="$(dirname "$0")/../frontend"

echo "=================================================="
echo "  Guidr Frontend Deployment"
echo "  Bucket: $BUCKET_NAME"
echo "=================================================="

# Build React app
echo ""
echo "▶ Building React app..."
cd $FRONTEND_DIR
npm install --silent
npm run build
echo "  ✓ Build complete"

# Sync to S3
echo ""
echo "▶ Uploading to S3..."
aws s3 sync dist/ s3://$BUCKET_NAME/ \
  --region $REGION \
  --delete \
  --cache-control "max-age=31536000,public" \
  --exclude "index.html"

# Upload index.html with no-cache (important for SPA routing)
aws s3 cp dist/index.html s3://$BUCKET_NAME/index.html \
  --region $REGION \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "text/html"

echo "  ✓ Files uploaded"

# Create/update CloudFront distribution
echo ""
echo "▶ Configuring CloudFront..."

CF_DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Origins.Items[0].DomainName=='${BUCKET_NAME}.s3.amazonaws.com'].Id" \
  --output text 2>/dev/null)

if [ -z "$CF_DIST_ID" ]; then
  echo "  Creating new CloudFront distribution..."

  CF_DIST_ID=$(aws cloudfront create-distribution \
    --distribution-config '{
      "CallerReference": "guidr-'$(date +%s)'",
      "Comment": "Guidr Frontend CDN",
      "DefaultCacheBehavior": {
        "TargetOriginId": "guidr-s3-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
        "AllowedMethods": {
          "Quantity": 2,
          "Items": ["HEAD","GET"],
          "CachedMethods": {"Quantity": 2,"Items": ["HEAD","GET"]}
        }
      },
      "Origins": {
        "Quantity": 1,
        "Items": [{
          "Id": "guidr-s3-origin",
          "DomainName": "'$BUCKET_NAME'.s3.amazonaws.com",
          "S3OriginConfig": {"OriginAccessIdentity": ""}
        }]
      },
      "CustomErrorResponses": {
        "Quantity": 1,
        "Items": [{
          "ErrorCode": 404,
          "ResponseCode": 200,
          "ResponsePagePath": "/index.html",
          "ErrorCachingMinTTL": 0
        }]
      },
      "DefaultRootObject": "index.html",
      "Enabled": true,
      "HttpVersion": "http2",
      "PriceClass": "PriceClass_100"
    }' \
    --query 'Distribution.Id' --output text)

  echo "  ✓ CloudFront distribution created: $CF_DIST_ID"
else
  # Invalidate cache for existing distribution
  echo "  Invalidating CloudFront cache..."
  aws cloudfront create-invalidation \
    --distribution-id $CF_DIST_ID \
    --paths "/*" > /dev/null
  echo "  ✓ Cache invalidated"
fi

CF_DOMAIN=$(aws cloudfront get-distribution \
  --id $CF_DIST_ID \
  --query 'Distribution.DomainName' --output text)

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✅ Frontend Deployment Complete!"
echo "══════════════════════════════════════════════════"
echo ""
echo "  CloudFront URL: https://$CF_DOMAIN"
echo ""
echo "  ⚠ Update your Lambda FRONTEND_URL environment variable:"
echo "    aws lambda update-function-configuration --function-name guidr-questions-service"
echo "    --environment 'Variables={FRONTEND_URL=https://$CF_DOMAIN}'"
echo ""
echo "  ⚠ Update API Gateway CORS allowed origins to:"
echo "    https://$CF_DOMAIN"
