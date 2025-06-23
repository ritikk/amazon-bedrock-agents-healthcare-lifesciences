# pr_sentiment_data_collector.py
import boto3
import json
from datetime import datetime
from typing import Dict, Any, Optional, List
import logging
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataCollectionError(Exception):
    """Custom exception for data collection errors"""
    pass

class PRSentimentDataCollector:
    """
    PR Sentiment Intelligence Agent - Data Collection Component
    Uses Amazon Bedrock InlineAgent with Tavily search integration
    """
    
    def __init__(self, region_name: str = 'us-east-1'):
        """
        Initialize the PR Sentiment Data Collector
        
        Args:
            region_name: AWS region for Bedrock services
        """
        self.bedrock_agent_runtime = boto3.client('bedrock-agent-runtime', region_name=region_name)
        self.region_name = region_name
        self.base_session_id = f"pr-sentiment-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
    def collect_drug_reviews(self, drug_name: str, max_results: int = 50, lambda_function_arn: str = None) -> Dict[str, Any]:
        """
        Collect patient reviews for a specific drug using InlineAgent with Tavily integration
        
        Args:
            drug_name: Name of the drug to analyze
            max_results: Maximum number of reviews to collect (default: 50)
            lambda_function_arn: ARN of the Tavily search processor Lambda function
            
        Returns:
            Dictionary containing collected review data and metadata
        """
        try:
            if not drug_name or not drug_name.strip():
                raise DataCollectionError("Drug name cannot be empty")
                
            if not lambda_function_arn:
                raise DataCollectionError("Lambda function ARN is required for Tavily integration")
            
            logger.info(f"Starting data collection for drug: {drug_name}")
            
            # Generate unique session ID for this collection
            session_id = f"{self.base_session_id}-{uuid.uuid4().hex[:8]}"
            
            # Configure InlineAgent with Tavily search capability
            inline_agent_config = self._build_inline_agent_config(
                session_id=session_id,
                drug_name=drug_name,
                max_results=max_results,
                lambda_function_arn=lambda_function_arn
            )
            
            # Invoke InlineAgent
            logger.info("Invoking InlineAgent for data collection...")
            response = self.bedrock_agent_runtime.invoke_inline_agent(**inline_agent_config)
            
            # Process streaming response
            collection_result = self._process_inline_agent_response(response, drug_name)
            
            logger.info(f"Data collection completed. Status: {collection_result.get('status')}")
            return collection_result
            
        except Exception as e:
            logger.error(f"Failed to collect drug reviews: {str(e)}", exc_info=True)
            raise DataCollectionError(f"Failed to collect drug reviews: {str(e)}")
    
    def _build_inline_agent_config(self, session_id: str, drug_name: str, max_results: int, lambda_function_arn: str) -> Dict[str, Any]:
        """Build InlineAgent configuration with Tavily search integration"""
        
        return {
            'sessionId': session_id,
            'foundationModel': 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
            'instruction': f'''You are a pharmaceutical data collection specialist that helps collect patient reviews for sentiment analysis.

Your task is to:
1. Use the TavilySearchProcessor function to search for patient reviews of "{drug_name}" on Drugs.com
2. Process and structure the collected review data
3. Provide a comprehensive summary of the data collection results
4. Handle any errors gracefully and provide clear status updates

Always maintain compliance with platform terms of service and data privacy guidelines.
Focus on collecting authentic patient experiences and reviews for sentiment analysis purposes.''',
            
            'actionGroups': [
                {
                    'actionGroupName': 'TavilySearchProcessor',
                    'description': 'Search for drug reviews on Drugs.com using Tavily API and process results',
                    'actionGroupExecutor': {
                        'lambda': lambda_function_arn
                    },
                    'apiSchema': {
                        'payload': json.dumps({
                            "openapi": "3.0.0",
                            "info": {
                                "title": "Tavily Search API", 
                                "version": "1.0.0"
                            },
                            "paths": {
                                "/search-drug-reviews": {
                                    "post": {
                                        "description": "Search for drug reviews on Drugs.com using Tavily",
                                        "operationId": "search-drug-reviews",
                                        "parameters": [
                                            {
                                                "name": "drug_name",
                                                "in": "query",
                                                "description": "Name of the drug to search for",
                                                "required": True,
                                                "schema": {"type": "string"}
                                            },
                                            {
                                                "name": "max_results",
                                                "in": "query", 
                                                "description": "Maximum number of results to return",
                                                "required": False,
                                                "schema": {"type": "integer", "default": 20}
                                            }
                                        ],
                                        "responses": {
                                            "200": {
                                                "description": "Successful search results",
                                                "content": {
                                                    "application/json": {
                                                        "schema": {
                                                            "type": "object",
                                                            "properties": {
                                                                "status": {"type": "string"},
                                                                "reviews": {"type": "array"},
                                                                "total_reviews_processed": {"type": "integer"}
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        })
                    }
                }
            ],
            
            'inputText': f'Please search for patient reviews of "{drug_name}" on Drugs.com. Collect up to {max_results} reviews and provide a structured summary of the data collection results including the number of reviews found, data quality, and any issues encountered.',
            
            # Remove guardrail configuration for now - can be added later if needed
            # 'guardrailConfiguration': {
            #     'guardrailIdentifier': 'healthcare-compliance-guardrail',
            #     'guardrailVersion': '1.0'
            # },
            
            'enableTrace': True,
            'idleSessionTTLInSeconds': 3600  # 1 hour session timeout
        }
    
    def _process_inline_agent_response(self, response: Dict[str, Any], drug_name: str) -> Dict[str, Any]:
        """
        Process streaming response from InlineAgent
        
        Args:
            response: Response from invoke_inline_agent
            drug_name: Name of the drug being analyzed
            
        Returns:
            Processed collection results
        """
        collected_data = []
        trace_info = []
        files_generated = []
        
        try:
            for event in response['completion']:
                if 'chunk' in event:
                    chunk = event['chunk']
                    if 'bytes' in chunk:
                        # Process text response
                        text = chunk['bytes'].decode('utf-8')
                        collected_data.append(text)
                        logger.debug(f"Received chunk: {text[:100]}...")
                        
                elif 'trace' in event:
                    # Process trace information for debugging
                    trace = event['trace']
                    trace_info.append(trace)
                    logger.debug(f"Trace event: {trace.get('trace', {}).get('orchestrationTrace', {}).get('modelInvocationInput', {}).get('text', '')[:100]}...")
                    
                elif 'files' in event:
                    # Process generated files (if any)
                    files = event['files']
                    for file in files.get('files', []):
                        files_generated.append({
                            'name': file.get('name'),
                            'type': file.get('type'),
                            'size': len(file.get('bytes', b''))
                        })
                        logger.info(f"Generated file: {file.get('name')}")
                        
                elif 'returnControl' in event:
                    # Handle return control events
                    control = event['returnControl']
                    logger.info(f"Return control event: {control}")
            
            # Combine all collected text
            full_response = ''.join(collected_data)
            
            # Try to parse JSON response if present
            structured_data = self._extract_structured_data(full_response)
            
            return {
                'status': 'completed',
                'drug_name': drug_name,
                'raw_response': full_response,
                'structured_data': structured_data,
                'trace_info': trace_info,
                'files_generated': files_generated,
                'collection_metadata': {
                    'collection_time': datetime.utcnow().isoformat(),
                    'response_length': len(full_response),
                    'trace_events': len(trace_info),
                    'files_generated': len(files_generated)
                }
            }
            
        except Exception as e:
            logger.error(f"Error processing InlineAgent response: {str(e)}", exc_info=True)
            return {
                'status': 'error',
                'drug_name': drug_name,
                'error': str(e),
                'partial_data': ''.join(collected_data) if collected_data else None,
                'collection_metadata': {
                    'collection_time': datetime.utcnow().isoformat(),
                    'error_occurred': True
                }
            }
    
    def _extract_structured_data(self, response_text: str) -> Optional[Dict[str, Any]]:
        """
        Extract structured data from the agent response
        
        Args:
            response_text: Raw response text from the agent
            
        Returns:
            Structured data if found, None otherwise
        """
        try:
            # Look for JSON blocks in the response
            import re
            json_pattern = r'\{.*\}'
            matches = re.findall(json_pattern, response_text, re.DOTALL)
            
            for match in matches:
                try:
                    parsed_data = json.loads(match)
                    if isinstance(parsed_data, dict) and 'reviews' in parsed_data:
                        return parsed_data
                except json.JSONDecodeError:
                    continue
            
            # If no JSON found, return basic structure
            return {
                'summary': response_text,
                'extraction_method': 'text_analysis'
            }
            
        except Exception as e:
            logger.warning(f"Failed to extract structured data: {str(e)}")
            return None
