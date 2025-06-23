#!/bin/bash

# Deploy Tavily Search Processor Lambda Function
# Usage: ./deploy_lambda.sh <tavily-api-key> [aws-region]

set -e

# Configuration
FUNCTION_NAME="pr-sentiment-tavily-search-processor"
RUNTIME="python3.12"
HANDLER="tavily_search_processor.lambda_handler"
TIMEOUT=300
MEMORY_SIZE=1024
AWS_REGION=${2:-us-east-1}
TAVILY_API_KEY=$1

if [ -z "$TAVILY_API_KEY" ]; then
    echo "Error: Tavily API key is required"
    echo "Usage: $0 <tavily-api-key> [aws-region]"
    exit 1
fi

echo "Deploying Lambda function: $FUNCTION_NAME"
echo "Region: $AWS_REGION"

# Create deployment directory
DEPLOY_DIR="lambda_deployment"
mkdir -p $DEPLOY_DIR

# Copy Lambda function code
cp ../lambda/tavily_search_processor.py $DEPLOY_DIR/
cp ../lambda/requirements.txt $DEPLOY_DIR/

# Install dependencies
cd $DEPLOY_DIR
pip install -r requirements.txt -t .

# Create deployment package
zip -r ../tavily-search-processor.zip .
cd ..

# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION >/dev/null 2>&1; then
    echo "Function exists, updating code..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://tavily-search-processor.zip \
        --region $AWS_REGION
    
    echo "Updating environment variables..."
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --environment Variables="{TAVILY_API_KEY=$TAVILY_API_KEY}" \
        --region $AWS_REGION
else
    echo "Creating new function..."
    
    # Create IAM role if it doesn't exist
    ROLE_NAME="pr-sentiment-lambda-role"
    ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null || echo "")
    
    if [ -z "$ROLE_ARN" ]; then
        echo "Creating IAM role..."
        
        # Create trust policy
        cat > trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF
        
        # Create role
        aws iam create-role \
            --role-name $ROLE_NAME \
            --assume-role-policy-document file://trust-policy.json
        
        # Attach basic execution policy
        aws iam attach-role-policy \
            --role-name $ROLE_NAME \
            --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        
        # Get role ARN
        ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
        
        # Wait for role to be available
        echo "Waiting for IAM role to be available..."
        sleep 10
        
        rm trust-policy.json
    fi
    
    # Create Lambda function
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --role $ROLE_ARN \
        --handler $HANDLER \
        --zip-file fileb://tavily-search-processor.zip \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE \
        --environment Variables="{TAVILY_API_KEY=$TAVILY_API_KEY}" \
        --region $AWS_REGION
fi

# Get function ARN
FUNCTION_ARN=$(aws lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION --query 'Configuration.FunctionArn' --output text)

echo "Lambda function deployed successfully!"
echo "Function ARN: $FUNCTION_ARN"

# Clean up
rm -rf $DEPLOY_DIR
rm tavily-search-processor.zip

# Test the function
echo "Testing the function..."
cat > test-event.json << EOF
{
    "parameters": [
        {
            "name": "drug_name",
            "value": "Lipitor"
        },
        {
            "name": "max_results", 
            "value": "5"
        }
    ]
}
EOF

echo "Running test invocation..."
aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload file://test-event.json \
    --region $AWS_REGION \
    test-response.json

echo "Test response:"
cat test-response.json | jq .

# Clean up test files
rm test-event.json test-response.json

echo "Deployment completed successfully!"
echo "Function ARN: $FUNCTION_ARN"
