# Epic 1: Data Collection & Processing - Technical Implementation Plan

## ✅ **IMPLEMENTATION COMPLETE - MOVED TO AGENTS_CATALOG**

**All Epic 1 components have been successfully implemented and moved to:**
📁 `/agents_catalog/22-PR-sentiment-intelligence-agent/`

### 🎯 **What Was Delivered:**
- ✅ Complete InlineAgent implementation with Tavily integration
- ✅ Advanced data processing and quality scoring
- ✅ Comprehensive Jupyter notebook with examples
- ✅ Production-ready deployment scripts
- ✅ Full documentation and evaluation framework

### 🚀 **Ready for Next Steps:**
Epic 1 provides the foundation for Epic 2 (Sentiment Analysis), Epic 3 (Risk Detection), and Epic 4 (Multi-Agent Collaboration).

---

## Overview
Implement data collection capabilities for the PR Sentiment Intelligence Agent using Amazon Bedrock InlineAgents with integrated Tavily search functionality to collect patient reviews from Drugs.com.

## Architecture Components

### InlineAgent Configuration
```python
data_collection_inline_agent = {
    'sessionId': 'pr-sentiment-data-collection-session',
    'foundationModel': 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    'instruction': '''You are a pharmaceutical data collection specialist that:
    - Uses Tavily API to search for patient reviews from Drugs.com
    - Processes and structures review data from web search results
    - Handles errors gracefully and provides clear status updates
    - Maintains compliance with platform terms of service and data privacy guidelines
    
    Always provide comprehensive drug review analysis with structured data output.''',
    
    'actionGroups': [
        {
            'actionGroupName': 'TavilySearchProcessor',
            'description': 'Search Drugs.com for patient reviews using Tavily API and process results',
            'actionGroupExecutor': {
                'lambda': 'arn:aws:lambda:region:account:function:tavily-search-processor'
            },
            'apiSchema': {
                'payload': json.dumps({
                    "openapi": "3.0.0",
                    "info": {"title": "Tavily Search API", "version": "1.0.0"},
                    "paths": {
                        "/search-drug-reviews": {
                            "post": {
                                "description": "Search for drug reviews on Drugs.com using Tavily",
                                "parameters": [
                                    {"name": "drug_name", "type": "string", "required": True},
                                    {"name": "max_results", "type": "integer", "required": False}
                                ]
                            }
                        }
                    }
                })
            }
        }
    ],
    
    'guardrailConfiguration': {
        'guardrailIdentifier': 'healthcare-compliance-guardrail',
        'guardrailVersion': '1.0'
    },
    
    'enableTrace': True
}
```
```

## Implementation Tasks

### Phase 1: InlineAgent Infrastructure Setup
- [x] **Task 1.1**: Set up InlineAgent invocation framework
  - [x] Create Python client for bedrock-agent-runtime
  - [x] Implement session management for InlineAgent
  - [x] Configure IAM permissions for InlineAgent invocation
  - [x] Set up error handling for InlineAgent API calls

- [x] **Task 1.2**: Build Tavily integration Lambda function
  - [x] Create Lambda function with Tavily API integration
  - [x] Implement drug review search functionality
  - [x] Add result processing and structuring
  - [x] Configure environment variables for Tavily API key

### Phase 2: InlineAgent Implementation (US-001, US-002)
- [x] **Task 2.1**: Implement InlineAgent invocation
  - [x] Create bedrock-agent-runtime client
  - [x] Build InlineAgent configuration with Tavily action group
  - [x] Implement session management and state handling
  - [x] Add streaming response processing

- [x] **Task 2.2**: Build Tavily search integration
  - [x] Create Lambda function for Tavily API calls
  - [x] Implement Drugs.com specific search queries
  - [x] Add result validation and quality filtering
  - [x] Build error handling for API failures

```python
# InlineAgent invocation implementation
import boto3
import json
from datetime import datetime

class PRSentimentDataCollector:
    def __init__(self):
        self.bedrock_agent_runtime = boto3.client('bedrock-agent-runtime')
        self.session_id = f"pr-sentiment-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
    def collect_drug_reviews(self, drug_name, max_results=50):
        try:
            # Configure InlineAgent
            inline_agent_config = {
                'sessionId': self.session_id,
                'foundationModel': 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
                'instruction': '''You are a pharmaceutical data collection specialist. 
                Use the Tavily search function to find patient reviews for the specified drug from Drugs.com. 
                Process and structure the results for sentiment analysis.''',
                
                'actionGroups': [
                    {
                        'actionGroupName': 'TavilySearchProcessor',
                        'description': 'Search for drug reviews using Tavily API',
                        'actionGroupExecutor': {
                            'lambda': 'arn:aws:lambda:${region}:${account-id}:function:tavily-search-processor'
                        },
                        'apiSchema': {
                            'payload': json.dumps({
                                "openapi": "3.0.0",
                                "info": {"title": "Tavily Search", "version": "1.0.0"},
                                "paths": {
                                    "/search-drug-reviews": {
                                        "post": {
                                            "description": "Search Drugs.com for patient reviews",
                                            "parameters": [
                                                {"name": "drug_name", "type": "string", "required": True},
                                                {"name": "max_results", "type": "integer", "required": False}
                                            ]
                                        }
                                    }
                                }
                            })
                        }
                    }
                ],
                
                'inputText': f'Search for patient reviews of {drug_name} on Drugs.com. Find up to {max_results} reviews and structure the data for analysis.',
                'enableTrace': True
            }
            
            # Invoke InlineAgent
            response = self.bedrock_agent_runtime.invoke_inline_agent(**inline_agent_config)
            
            # Process streaming response
            return self._process_inline_agent_response(response)
            
        except Exception as e:
            raise DataCollectionError(f"Failed to collect drug reviews: {str(e)}")
            
    def _process_inline_agent_response(self, response):
        """Process streaming response from InlineAgent"""
        collected_data = []
        
        for event in response['completion']:
            if 'chunk' in event:
                chunk = event['chunk']
                if 'bytes' in chunk:
                    # Process text response
                    text = chunk['bytes'].decode('utf-8')
                    collected_data.append(text)
                    
            elif 'trace' in event:
                # Process trace information for debugging
                trace = event['trace']
                print(f"Trace: {trace}")
                
        return {
            'status': 'completed',
            'data': ''.join(collected_data),
            'session_id': self.session_id
        }
```

### Phase 3: Data Processing & Cleaning (US-001, US-002)
- [x] **Task 3.1**: Implement ReviewDataProcessor action group
  - [x] Create data cleaning and normalization functions
  - [x] Remove duplicate reviews based on content similarity
  - [x] Extract structured metadata from Tavily search results
  - [x] Implement data quality validation

- [x] **Task 3.2**: Build review data structure
  - [x] Define standardized review schema
  - [x] Extract patient demographics when available
  - [x] Normalize rating scales and dates
  - [x] Flag potentially fake or spam reviews

```python
# Data processing structure
class ReviewProcessor:
    def process_tavily_results(self, tavily_results):
        processed_reviews = []
        
        for result in tavily_results:
            # Extract review content from Tavily result
            review_data = self._extract_review_from_tavily_result(result)
            
            if review_data:
                processed_review = {
                    'id': self._generate_review_id(review_data),
                    'drug_name': review_data['drug_name'],
                    'rating': self._normalize_rating(review_data.get('rating')),
                    'review_text': self._clean_text(review_data['content']),
                    'review_date': self._parse_date(review_data.get('date')),
                    'patient_info': self._extract_demographics(review_data),
                    'source_url': result.get('url'),
                    'metadata': {
                        'source': 'drugs.com',
                        'collected_via': 'tavily_search',
                        'processed_at': datetime.utcnow().isoformat(),
                        'quality_score': self._calculate_quality_score(review_data),
                        'tavily_score': result.get('score', 0)
                    }
                }
                processed_reviews.append(processed_review)
                
        return self._deduplicate_reviews(processed_reviews)
        
    def _extract_review_from_tavily_result(self, tavily_result):
        """Extract structured review data from Tavily search result"""
        try:
            content = tavily_result.get('content', '')
            title = tavily_result.get('title', '')
            url = tavily_result.get('url', '')
            
            # Parse review content using NLP techniques
            review_data = {
                'content': content,
                'title': title,
                'url': url,
                'drug_name': self._extract_drug_name(content, title),
                'rating': self._extract_rating(content, title),
                'date': self._extract_date(content),
                'patient_demographics': self._extract_demographics(content)
            }
            
            return review_data if self._is_valid_review(review_data) else None
            
        except Exception as e:
            self._log_processing_error(e, tavily_result)
            return None
```

## Lambda Function Implementation

### Tavily Search Processor Lambda
```python
# tavily_search_processor.py
import json
import requests
import os
from datetime import datetime

def lambda_handler(event, context):
    """
    Lambda function to search Drugs.com using Tavily API
    """
    try:
        # Extract parameters from InlineAgent
        parameters = event.get('parameters', [])
        drug_name = next((p['value'] for p in parameters if p['name'] == 'drug_name'), None)
        max_results = int(next((p['value'] for p in parameters if p['name'] == 'max_results'), 20))
        
        if not drug_name:
            return error_response("Drug name is required")
            
        # Build Tavily search query
        search_query = f'site:drugs.com "{drug_name}" reviews patient experiences'
        
        # Call Tavily API
        tavily_response = search_with_tavily(search_query, max_results)
        
        # Process and structure results
        processed_results = process_search_results(tavily_response, drug_name)
        
        return success_response(processed_results)
        
    except Exception as e:
        return error_response(f"Search failed: {str(e)}")

def search_with_tavily(query, max_results):
    """Search using Tavily API"""
    tavily_api_key = os.environ.get('TAVILY_API_KEY')
    
    payload = {
        "api_key": tavily_api_key,
        "query": query,
        "search_depth": "advanced",
        "include_domains": ["drugs.com"],
        "max_results": max_results
    }
    
    response = requests.post(
        "https://api.tavily.com/search",
        json=payload,
        headers={"Content-Type": "application/json"}
    )
    
    return response.json()

def process_search_results(tavily_response, drug_name):
    """Process Tavily results into structured review data"""
    processed_reviews = []
    
    for result in tavily_response.get('results', []):
        review_data = {
            'drug_name': drug_name,
            'title': result.get('title', ''),
            'content': result.get('content', ''),
            'url': result.get('url', ''),
            'score': result.get('score', 0),
            'processed_at': datetime.utcnow().isoformat(),
            'source': 'drugs.com'
        }
        processed_reviews.append(review_data)
    
    return {
        'total_reviews': len(processed_reviews),
        'reviews': processed_reviews,
        'search_query': tavily_response.get('query', ''),
        'search_metadata': {
            'search_time': datetime.utcnow().isoformat(),
            'results_found': len(processed_reviews)
        }
    }

def success_response(data):
    """Format successful response for InlineAgent"""
    return {
        'response': {
            'actionGroup': 'TavilySearchProcessor',
            'function': 'search-drug-reviews',
            'functionResponse': {
                'responseBody': {
                    'TEXT': {
                        'body': json.dumps(data, indent=2)
                    }
                }
            }
        }
    }

def error_response(error_message):
    """Format error response for InlineAgent"""
    return {
        'response': {
            'actionGroup': 'TavilySearchProcessor',
            'function': 'search-drug-reviews',
            'functionResponse': {
                'responseBody': {
                    'TEXT': {
                        'body': json.dumps({
                            'error': error_message,
                            'status': 'failed'
                        })
                    }
                }
            }
        }
    }
```

### Integration Requirements
- [x] **React UI Integration**: Seamless chatbot interface
- [x] **Real-time Updates**: Progress indicators during data collection
- [x] **Error Display**: User-friendly error messages in UI
- [x] **Session Management**: Maintain context across interactions

## Deployment Instructions

1. **Prerequisites**:
   - Ensure Bedrock model access for Claude 3.5 Haiku
   - Configure healthcare compliance guardrails
   - Obtain Tavily API key from tavily.com

2. **Deploy Lambda Function**:
   ```bash
   # Create deployment package
   zip -r tavily-search-processor.zip tavily_search_processor.py
   
   # Deploy Lambda function
   aws lambda create-function \
     --function-name tavily-search-processor \
     --runtime python3.12 \
     --role arn:aws:iam::ACCOUNT:role/lambda-execution-role \
     --handler tavily_search_processor.lambda_handler \
     --zip-file fileb://tavily-search-processor.zip \
     --environment Variables='{TAVILY_API_KEY=your-tavily-api-key}'
   ```

3. **Configure IAM Permissions**:
   ```bash
   # Create policy for InlineAgent invocation
   aws iam create-policy \
     --policy-name InlineAgentPolicy \
     --policy-document '{
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": "bedrock:InvokeInlineAgent",
           "Resource": "*"
         },
         {
           "Effect": "Allow",
           "Action": "lambda:InvokeFunction",
           "Resource": "arn:aws:lambda:*:*:function:tavily-search-processor"
         }
       ]
     }'
   ```

4. **Test InlineAgent**:
   ```python
   # Test the implementation
   collector = PRSentimentDataCollector()
   results = collector.collect_drug_reviews("Lipitor", max_results=10)
   print(results)
   ```

