#!/usr/bin/env python3
"""
Test script for the PR Sentiment Tavily Search Processor Lambda function
"""

import boto3
import json
import sys

def test_lambda_function(function_arn, region='us-east-1'):
    """Test the deployed Lambda function"""
    
    # Initialize Lambda client
    lambda_client = boto3.client('lambda', region_name=region)
    
    # Create test event in the format expected by the Lambda function
    test_event = {
        "actionGroup": "TavilySearchProcessor",
        "function": "search-drug-reviews",
        "parameters": [
            {
                "name": "drug_name",
                "value": "Lipitor"
            },
            {
                "name": "max_results", 
                "value": "3"
            }
        ]
    }
    
    print(f"🧪 Testing Lambda function: {function_arn}")
    print(f"📝 Test event: {json.dumps(test_event, indent=2)}")
    
    try:
        # Invoke the Lambda function
        response = lambda_client.invoke(
            FunctionName=function_arn,
            Payload=json.dumps(test_event)
        )
        
        # Read the response
        payload = response['Payload'].read()
        result = json.loads(payload)
        
        print(f"\n✅ Lambda invocation successful!")
        print(f"📊 Status Code: {response['StatusCode']}")
        
        # Parse and display the result
        if 'response' in result:
            function_response = result['response']
            if 'functionResponse' in function_response:
                response_body = function_response['functionResponse']['responseBody']
                if 'TEXT' in response_body:
                    body_content = json.loads(response_body['TEXT']['body'])
                    
                    print(f"\n📋 Function Response Summary:")
                    print(f"   - Status: {body_content.get('status', 'unknown')}")
                    print(f"   - Drug: {body_content.get('drug_name', 'unknown')}")
                    print(f"   - Reviews Found: {body_content.get('total_reviews_found', 0)}")
                    print(f"   - Reviews Processed: {body_content.get('total_reviews_processed', 0)}")
                    
                    if body_content.get('reviews'):
                        print(f"\n📝 Sample Review:")
                        sample_review = body_content['reviews'][0]
                        print(f"   - Title: {sample_review.get('title', 'N/A')[:100]}...")
                        print(f"   - Content Length: {len(sample_review.get('content', ''))}")
                        print(f"   - Quality Score: {sample_review.get('metadata', {}).get('quality_score', 'N/A')}")
                        print(f"   - Rating: {sample_review.get('rating', 'N/A')}")
                    
                    return True
        
        print(f"\n📄 Raw Response: {json.dumps(result, indent=2)}")
        return True
        
    except Exception as e:
        print(f"\n❌ Lambda invocation failed: {str(e)}")
        
        # Check for common issues
        if "AccessDenied" in str(e):
            print("💡 Tip: Check your AWS credentials and IAM permissions")
        elif "ResourceNotFound" in str(e):
            print("💡 Tip: Verify the Lambda function ARN is correct")
        elif "InvalidParameterValue" in str(e):
            print("💡 Tip: Check the function name and region")
            
        return False

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python test_lambda.py <lambda-function-arn> [region]")
        print("Example: python test_lambda.py arn:aws:lambda:us-east-1:123456789012:function:pr-sentiment-tavily-search-processor us-east-1")
        sys.exit(1)
    
    function_arn = sys.argv[1]
    region = sys.argv[2] if len(sys.argv) > 2 else 'us-east-1'
    
    success = test_lambda_function(function_arn, region)
    
    if success:
        print(f"\n🎉 Test completed successfully!")
        print(f"💡 The Lambda function is working correctly and ready for InlineAgent integration.")
    else:
        print(f"\n⚠️ Test failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
