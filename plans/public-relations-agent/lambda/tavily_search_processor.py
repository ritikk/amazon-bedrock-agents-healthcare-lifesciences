# tavily_search_processor.py
import json
import requests
import os
from datetime import datetime
import logging
import re
from typing import Dict, List, Any, Optional

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Lambda function to search Drugs.com using Tavily API for InlineAgent
    """
    try:
        logger.info(f"Received event: {json.dumps(event, default=str)}")
        
        # Extract parameters from InlineAgent event structure
        parameters = event.get('parameters', [])
        drug_name = next((p['value'] for p in parameters if p['name'] == 'drug_name'), None)
        max_results = int(next((p['value'] for p in parameters if p['name'] == 'max_results'), 20))
        
        if not drug_name:
            return error_response("Drug name is required for search")
            
        logger.info(f"Searching for drug: {drug_name}, max_results: {max_results}")
        
        # Build Tavily search query specifically for Drugs.com reviews
        search_query = f'site:drugs.com "{drug_name}" reviews patient experiences'
        
        # Call Tavily API
        tavily_response = search_with_tavily(search_query, max_results)
        
        # Process and structure results for sentiment analysis
        processed_results = process_search_results(tavily_response, drug_name)
        
        logger.info(f"Successfully processed {len(processed_results.get('reviews', []))} reviews")
        
        return success_response(processed_results)
        
    except Exception as e:
        logger.error(f"Search failed: {str(e)}", exc_info=True)
        return error_response(f"Search failed: {str(e)}")

def search_with_tavily(query: str, max_results: int) -> Dict[str, Any]:
    """Search using Tavily API with error handling and rate limiting"""
    tavily_api_key = os.environ.get('TAVILY_API_KEY')
    
    if not tavily_api_key:
        raise ValueError("TAVILY_API_KEY environment variable not set")
    
    payload = {
        "api_key": tavily_api_key,
        "query": query,
        "search_depth": "advanced",
        "include_domains": ["drugs.com"],
        "max_results": min(max_results, 50),  # Cap at 50 for performance
        "include_answer": False,
        "include_raw_content": True
    }
    
    try:
        response = requests.post(
            "https://api.tavily.com/search",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        response.raise_for_status()
        
        return response.json()
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Tavily API request failed: {str(e)}")
        raise Exception(f"Failed to search Tavily API: {str(e)}")

def process_search_results(tavily_response: Dict[str, Any], drug_name: str) -> Dict[str, Any]:
    """Process Tavily results into structured review data for sentiment analysis"""
    processed_reviews = []
    
    results = tavily_response.get('results', [])
    logger.info(f"Processing {len(results)} Tavily results")
    
    for idx, result in enumerate(results):
        try:
            # Extract and clean review data
            review_data = extract_review_data(result, drug_name, idx)
            
            if review_data and is_valid_review(review_data):
                processed_reviews.append(review_data)
                
        except Exception as e:
            logger.warning(f"Failed to process result {idx}: {str(e)}")
            continue
    
    # Remove duplicates based on content similarity
    deduplicated_reviews = deduplicate_reviews(processed_reviews)
    
    return {
        'status': 'success',
        'drug_name': drug_name,
        'total_reviews_found': len(results),
        'total_reviews_processed': len(deduplicated_reviews),
        'reviews': deduplicated_reviews,
        'search_metadata': {
            'search_query': tavily_response.get('query', ''),
            'search_time': datetime.utcnow().isoformat(),
            'tavily_results_count': len(results)
        }
    }

def extract_review_data(result: Dict[str, Any], drug_name: str, index: int) -> Optional[Dict[str, Any]]:
    """Extract structured review data from Tavily search result"""
    try:
        title = result.get('title', '')
        content = result.get('content', '')
        url = result.get('url', '')
        score = result.get('score', 0)
        
        # Extract rating if present in title or content
        rating = extract_rating(title, content)
        
        # Extract date if present
        review_date = extract_date(content)
        
        # Extract patient demographics if available
        demographics = extract_demographics(content)
        
        # Calculate quality score
        quality_score = calculate_quality_score(title, content, rating)
        
        review_data = {
            'id': f"{drug_name.lower().replace(' ', '_')}_{index}_{hash(content) % 10000}",
            'drug_name': drug_name,
            'title': clean_text(title),
            'content': clean_text(content),
            'url': url,
            'rating': rating,
            'review_date': review_date,
            'patient_demographics': demographics,
            'metadata': {
                'source': 'drugs.com',
                'collection_method': 'tavily_search',
                'tavily_score': score,
                'quality_score': quality_score,
                'processed_at': datetime.utcnow().isoformat(),
                'content_length': len(content)
            }
        }
        
        return review_data
        
    except Exception as e:
        logger.warning(f"Failed to extract review data: {str(e)}")
        return None

def extract_rating(title: str, content: str) -> Optional[float]:
    """Extract numerical rating from title or content"""
    text = f"{title} {content}".lower()
    
    # Look for patterns like "5/5", "4 out of 5", "3.5 stars", etc.
    rating_patterns = [
        r'(\d+(?:\.\d+)?)\s*(?:out\s*of\s*|\/)?\s*(?:5|10)\s*(?:stars?)?',
        r'(\d+(?:\.\d+)?)\s*stars?',
        r'rating:?\s*(\d+(?:\.\d+)?)',
        r'(\d+(?:\.\d+)?)\s*\/\s*(?:5|10)'
    ]
    
    for pattern in rating_patterns:
        match = re.search(pattern, text)
        if match:
            try:
                rating = float(match.group(1))
                # Normalize to 5-point scale
                if rating > 5:
                    rating = rating / 2  # Assume 10-point scale
                return min(rating, 5.0)
            except ValueError:
                continue
    
    return None

def extract_date(content: str) -> Optional[str]:
    """Extract review date from content"""
    # Look for date patterns
    date_patterns = [
        r'(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
        r'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})',
        r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})'
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            return match.group(1)
    
    return None

def extract_demographics(content: str) -> Dict[str, Any]:
    """Extract patient demographic information if available"""
    demographics = {}
    content_lower = content.lower()
    
    # Age extraction
    age_patterns = [
        r'(?:i am|i\'m|age)\s*(\d{1,2})\s*(?:years?\s*old|yo)',
        r'(\d{1,2})\s*(?:year\s*old|yo)',
        r'age\s*(\d{1,2})'
    ]
    
    for pattern in age_patterns:
        match = re.search(pattern, content_lower)
        if match:
            age = int(match.group(1))
            if 10 <= age <= 100:  # Reasonable age range
                demographics['age'] = age
                break
    
    # Gender extraction
    if any(word in content_lower for word in ['female', 'woman', 'girl', 'she', 'her']):
        demographics['gender'] = 'female'
    elif any(word in content_lower for word in ['male', 'man', 'boy', 'he', 'his']):
        demographics['gender'] = 'male'
    
    return demographics

def calculate_quality_score(title: str, content: str, rating: Optional[float]) -> float:
    """Calculate quality score for the review (0-1 scale)"""
    score = 0.0
    
    # Content length score (longer reviews generally more informative)
    content_length = len(content)
    if content_length > 500:
        score += 0.3
    elif content_length > 200:
        score += 0.2
    elif content_length > 50:
        score += 0.1
    
    # Has rating score
    if rating is not None:
        score += 0.2
    
    # Contains medical/drug-related terms
    medical_terms = ['side effect', 'dosage', 'doctor', 'prescription', 'treatment', 'symptoms', 'condition']
    if any(term in content.lower() for term in medical_terms):
        score += 0.3
    
    # Title quality
    if len(title) > 10:
        score += 0.1
    
    # Specific experience indicators
    experience_indicators = ['took', 'taking', 'prescribed', 'helped', 'worked', 'experienced']
    if any(indicator in content.lower() for indicator in experience_indicators):
        score += 0.1
    
    return min(score, 1.0)

def is_valid_review(review_data: Dict[str, Any]) -> bool:
    """Validate if the extracted data represents a valid patient review"""
    content = review_data.get('content', '')
    
    # Minimum content length
    if len(content) < 20:
        return False
    
    # Must contain drug-related content
    drug_indicators = ['drug', 'medication', 'pill', 'tablet', 'dose', 'treatment', 'prescribed']
    if not any(indicator in content.lower() for indicator in drug_indicators):
        return False
    
    # Quality score threshold
    if review_data.get('metadata', {}).get('quality_score', 0) < 0.2:
        return False
    
    return True

def deduplicate_reviews(reviews: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Remove duplicate reviews based on content similarity"""
    if not reviews:
        return reviews
    
    unique_reviews = []
    seen_content_hashes = set()
    
    for review in reviews:
        content = review.get('content', '')
        # Create a simple hash of the first 100 characters
        content_hash = hash(content[:100].lower().strip())
        
        if content_hash not in seen_content_hashes:
            seen_content_hashes.add(content_hash)
            unique_reviews.append(review)
    
    logger.info(f"Deduplicated {len(reviews)} reviews to {len(unique_reviews)} unique reviews")
    return unique_reviews

def clean_text(text: str) -> str:
    """Clean and normalize text content"""
    if not text:
        return ""
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text.strip())
    
    # Remove HTML entities
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    
    return text

def success_response(data: Dict[str, Any]) -> Dict[str, Any]:
    """Format successful response for InlineAgent"""
    return {
        'response': {
            'actionGroup': 'TavilySearchProcessor',
            'function': 'search-drug-reviews',
            'functionResponse': {
                'responseBody': {
                    'TEXT': {
                        'body': json.dumps(data, indent=2, default=str)
                    }
                }
            }
        }
    }

def error_response(error_message: str) -> Dict[str, Any]:
    """Format error response for InlineAgent"""
    return {
        'response': {
            'actionGroup': 'TavilySearchProcessor',
            'function': 'search-drug-reviews',
            'functionResponse': {
                'responseBody': {
                    'TEXT': {
                        'body': json.dumps({
                            'status': 'error',
                            'error': error_message,
                            'timestamp': datetime.utcnow().isoformat()
                        }, indent=2)
                    }
                }
            }
        }
    }
