# review_data_processor.py
import json
import re
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Set
import hashlib
import logging
from dataclasses import dataclass
from collections import defaultdict

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class ReviewMetrics:
    """Data class for review quality metrics"""
    content_length: int
    has_rating: bool
    has_demographics: bool
    medical_terms_count: int
    quality_score: float
    spam_indicators: int

class ReviewDataProcessor:
    """
    Advanced data processing and cleaning for patient reviews
    Handles deduplication, quality assessment, and structured data extraction
    """
    
    def __init__(self):
        self.medical_terms = {
            'conditions': ['diabetes', 'hypertension', 'depression', 'anxiety', 'arthritis', 'cancer', 'heart disease'],
            'symptoms': ['pain', 'nausea', 'fatigue', 'headache', 'dizziness', 'insomnia', 'appetite'],
            'effects': ['side effect', 'adverse', 'reaction', 'allergy', 'improvement', 'relief', 'worse'],
            'medical': ['doctor', 'physician', 'prescription', 'dosage', 'treatment', 'therapy', 'medication']
        }
        
        self.spam_indicators = [
            'click here', 'buy now', 'discount', 'free trial', 'miracle cure',
            'guaranteed', 'lose weight fast', 'make money', 'work from home'
        ]
        
        self.quality_thresholds = {
            'min_content_length': 20,
            'max_content_length': 5000,
            'min_quality_score': 0.3,
            'max_spam_indicators': 2
        }
    
    def process_tavily_results(self, tavily_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process Tavily search results into structured review data
        
        Args:
            tavily_results: Raw results from Tavily API
            
        Returns:
            Processed and cleaned review data
        """
        try:
            logger.info("Starting Tavily results processing...")
            
            # Extract reviews from Tavily results
            raw_reviews = self._extract_reviews_from_tavily(tavily_results)
            logger.info(f"Extracted {len(raw_reviews)} raw reviews")
            
            # Process each review
            processed_reviews = []
            for idx, review in enumerate(raw_reviews):
                try:
                    processed_review = self._process_single_review(review, idx)
                    if processed_review and self._is_valid_review(processed_review):
                        processed_reviews.append(processed_review)
                except Exception as e:
                    logger.warning(f"Failed to process review {idx}: {str(e)}")
                    continue
            
            logger.info(f"Successfully processed {len(processed_reviews)} reviews")
            
            # Deduplicate reviews
            deduplicated_reviews = self._deduplicate_reviews(processed_reviews)
            logger.info(f"After deduplication: {len(deduplicated_reviews)} unique reviews")
            
            # Generate processing summary
            processing_summary = self._generate_processing_summary(
                raw_reviews, processed_reviews, deduplicated_reviews
            )
            
            return {
                'status': 'success',
                'reviews': deduplicated_reviews,
                'processing_summary': processing_summary,
                'metadata': {
                    'processed_at': datetime.utcnow().isoformat(),
                    'total_raw_reviews': len(raw_reviews),
                    'total_processed_reviews': len(processed_reviews),
                    'total_unique_reviews': len(deduplicated_reviews),
                    'processing_success_rate': len(processed_reviews) / max(len(raw_reviews), 1)
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to process Tavily results: {str(e)}", exc_info=True)
            return {
                'status': 'error',
                'error': str(e),
                'reviews': [],
                'metadata': {
                    'processed_at': datetime.utcnow().isoformat(),
                    'processing_failed': True
                }
            }
    
    def _extract_reviews_from_tavily(self, tavily_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract review data from Tavily search results"""
        reviews = []
        
        # Handle different Tavily result structures
        if 'reviews' in tavily_results:
            # Direct reviews array
            reviews = tavily_results['reviews']
        elif 'results' in tavily_results:
            # Tavily search results format
            for result in tavily_results['results']:
                review = {
                    'title': result.get('title', ''),
                    'content': result.get('content', ''),
                    'url': result.get('url', ''),
                    'score': result.get('score', 0),
                    'raw_content': result.get('raw_content', '')
                }
                reviews.append(review)
        
        return reviews
    
    def _process_single_review(self, review: Dict[str, Any], index: int) -> Optional[Dict[str, Any]]:
        """
        Process a single review into structured format
        
        Args:
            review: Raw review data
            index: Review index for ID generation
            
        Returns:
            Processed review data or None if invalid
        """
        try:
            # Extract basic information
            title = self._clean_text(review.get('title', ''))
            content = self._clean_text(review.get('content', ''))
            url = review.get('url', '')
            
            if not content:
                return None
            
            # Generate unique ID
            review_id = self._generate_review_id(content, index)
            
            # Extract structured data
            rating = self._extract_rating(title, content)
            review_date = self._extract_date(content)
            demographics = self._extract_demographics(content)
            drug_mentions = self._extract_drug_mentions(content)
            
            # Calculate quality metrics
            metrics = self._calculate_review_metrics(title, content, rating, demographics)
            
            # Extract medical context
            medical_context = self._extract_medical_context(content)
            
            processed_review = {
                'id': review_id,
                'title': title,
                'content': content,
                'url': url,
                'rating': rating,
                'review_date': review_date,
                'patient_demographics': demographics,
                'drug_mentions': drug_mentions,
                'medical_context': medical_context,
                'quality_metrics': {
                    'content_length': metrics.content_length,
                    'has_rating': metrics.has_rating,
                    'has_demographics': metrics.has_demographics,
                    'medical_terms_count': metrics.medical_terms_count,
                    'quality_score': metrics.quality_score,
                    'spam_indicators': metrics.spam_indicators
                },
                'metadata': {
                    'source': 'drugs.com',
                    'collection_method': 'tavily_search',
                    'processed_at': datetime.utcnow().isoformat(),
                    'tavily_score': review.get('score', 0),
                    'original_index': index
                }
            }
            
            return processed_review
            
        except Exception as e:
            logger.warning(f"Failed to process single review: {str(e)}")
            return None
    
    def _generate_review_id(self, content: str, index: int) -> str:
        """Generate unique ID for review"""
        content_hash = hashlib.md5(content.encode()).hexdigest()[:8]
        timestamp = datetime.utcnow().strftime('%Y%m%d')
        return f"review_{timestamp}_{index}_{content_hash}"
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text content"""
        if not text:
            return ""
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove HTML entities and tags
        text = re.sub(r'&[a-zA-Z0-9#]+;', '', text)
        text = re.sub(r'<[^>]+>', '', text)
        
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s.,!?;:()\-\'"\/]', '', text)
        
        return text
    
    def _extract_rating(self, title: str, content: str) -> Optional[float]:
        """Extract numerical rating from title or content"""
        text = f"{title} {content}".lower()
        
        # Rating patterns
        patterns = [
            r'(\d+(?:\.\d+)?)\s*(?:out\s*of\s*|\/)?\s*(?:5|10)\s*(?:stars?)?',
            r'(\d+(?:\.\d+)?)\s*stars?',
            r'rating:?\s*(\d+(?:\.\d+)?)',
            r'(\d+(?:\.\d+)?)\s*\/\s*(?:5|10)',
            r'gave\s+it\s+(\d+(?:\.\d+)?)',
            r'rate\s+it\s+(\d+(?:\.\d+)?)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    rating = float(match.group(1))
                    # Normalize to 5-point scale
                    if rating > 5:
                        rating = rating / 2
                    return min(max(rating, 0), 5.0)
                except ValueError:
                    continue
        
        return None
    
    def _extract_date(self, content: str) -> Optional[str]:
        """Extract review date from content"""
        date_patterns = [
            r'(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
            r'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})',
            r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})',
            r'((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})'
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def _extract_demographics(self, content: str) -> Dict[str, Any]:
        """Extract patient demographic information"""
        demographics = {}
        content_lower = content.lower()
        
        # Age extraction
        age_patterns = [
            r'(?:i am|i\'m|age)\s*(\d{1,2})\s*(?:years?\s*old|yo)',
            r'(\d{1,2})\s*(?:year\s*old|yo|years?\s*old)',
            r'age\s*(\d{1,2})'
        ]
        
        for pattern in age_patterns:
            match = re.search(pattern, content_lower)
            if match:
                age = int(match.group(1))
                if 10 <= age <= 100:
                    demographics['age'] = age
                    break
        
        # Gender extraction
        female_indicators = ['female', 'woman', 'girl', 'she', 'her', 'mother', 'wife', 'daughter']
        male_indicators = ['male', 'man', 'boy', 'he', 'his', 'father', 'husband', 'son']
        
        female_count = sum(1 for indicator in female_indicators if indicator in content_lower)
        male_count = sum(1 for indicator in male_indicators if indicator in content_lower)
        
        if female_count > male_count:
            demographics['gender'] = 'female'
        elif male_count > female_count:
            demographics['gender'] = 'male'
        
        return demographics
    
    def _extract_drug_mentions(self, content: str) -> List[str]:
        """Extract drug names mentioned in the review"""
        # This is a simplified version - in production, you'd use a comprehensive drug database
        common_drugs = [
            'lipitor', 'metformin', 'lisinopril', 'amlodipine', 'metoprolol',
            'omeprazole', 'simvastatin', 'losartan', 'gabapentin', 'sertraline'
        ]
        
        content_lower = content.lower()
        mentioned_drugs = []
        
        for drug in common_drugs:
            if drug in content_lower:
                mentioned_drugs.append(drug.title())
        
        return mentioned_drugs
    
    def _extract_medical_context(self, content: str) -> Dict[str, List[str]]:
        """Extract medical context from review content"""
        content_lower = content.lower()
        medical_context = {}
        
        for category, terms in self.medical_terms.items():
            found_terms = []
            for term in terms:
                if term in content_lower:
                    found_terms.append(term)
            if found_terms:
                medical_context[category] = found_terms
        
        return medical_context
    
    def _calculate_review_metrics(self, title: str, content: str, rating: Optional[float], demographics: Dict[str, Any]) -> ReviewMetrics:
        """Calculate quality metrics for a review"""
        content_length = len(content)
        has_rating = rating is not None
        has_demographics = bool(demographics)
        
        # Count medical terms
        content_lower = content.lower()
        medical_terms_count = 0
        for terms in self.medical_terms.values():
            medical_terms_count += sum(1 for term in terms if term in content_lower)
        
        # Count spam indicators
        spam_indicators = sum(1 for indicator in self.spam_indicators if indicator in content_lower)
        
        # Calculate quality score
        quality_score = 0.0
        
        # Content length score
        if 50 <= content_length <= 2000:
            quality_score += 0.3
        elif content_length > 2000:
            quality_score += 0.2
        elif content_length >= 20:
            quality_score += 0.1
        
        # Rating score
        if has_rating:
            quality_score += 0.2
        
        # Demographics score
        if has_demographics:
            quality_score += 0.1
        
        # Medical terms score
        if medical_terms_count > 0:
            quality_score += min(medical_terms_count * 0.05, 0.3)
        
        # Spam penalty
        quality_score -= spam_indicators * 0.1
        
        # Experience indicators
        experience_indicators = ['took', 'taking', 'prescribed', 'helped', 'worked', 'experienced', 'felt']
        experience_count = sum(1 for indicator in experience_indicators if indicator in content_lower)
        if experience_count > 0:
            quality_score += min(experience_count * 0.02, 0.1)
        
        quality_score = max(0.0, min(1.0, quality_score))
        
        return ReviewMetrics(
            content_length=content_length,
            has_rating=has_rating,
            has_demographics=has_demographics,
            medical_terms_count=medical_terms_count,
            quality_score=quality_score,
            spam_indicators=spam_indicators
        )
    
    def _is_valid_review(self, review: Dict[str, Any]) -> bool:
        """Validate if review meets quality standards"""
        metrics = review.get('quality_metrics', {})
        
        # Check minimum content length
        if metrics.get('content_length', 0) < self.quality_thresholds['min_content_length']:
            return False
        
        # Check maximum content length
        if metrics.get('content_length', 0) > self.quality_thresholds['max_content_length']:
            return False
        
        # Check quality score
        if metrics.get('quality_score', 0) < self.quality_thresholds['min_quality_score']:
            return False
        
        # Check spam indicators
        if metrics.get('spam_indicators', 0) > self.quality_thresholds['max_spam_indicators']:
            return False
        
        # Must contain some medical context
        medical_context = review.get('medical_context', {})
        if not medical_context:
            return False
        
        return True
    
    def _deduplicate_reviews(self, reviews: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate reviews based on content similarity"""
        if not reviews:
            return reviews
        
        unique_reviews = []
        seen_hashes = set()
        
        for review in reviews:
            content = review.get('content', '')
            
            # Create content hash for similarity detection
            # Use first 200 characters for similarity comparison
            content_sample = content[:200].lower().strip()
            content_hash = hashlib.md5(content_sample.encode()).hexdigest()
            
            if content_hash not in seen_hashes:
                seen_hashes.add(content_hash)
                unique_reviews.append(review)
        
        logger.info(f"Deduplicated {len(reviews)} reviews to {len(unique_reviews)} unique reviews")
        return unique_reviews
    
    def _generate_processing_summary(self, raw_reviews: List[Dict[str, Any]], 
                                   processed_reviews: List[Dict[str, Any]], 
                                   deduplicated_reviews: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate summary of processing results"""
        
        # Quality distribution
        quality_scores = [r.get('quality_metrics', {}).get('quality_score', 0) for r in processed_reviews]
        
        # Rating distribution
        ratings = [r.get('rating') for r in processed_reviews if r.get('rating') is not None]
        
        # Demographics summary
        ages = [r.get('patient_demographics', {}).get('age') for r in processed_reviews if r.get('patient_demographics', {}).get('age')]
        genders = [r.get('patient_demographics', {}).get('gender') for r in processed_reviews if r.get('patient_demographics', {}).get('gender')]
        
        return {
            'processing_stats': {
                'raw_reviews': len(raw_reviews),
                'processed_reviews': len(processed_reviews),
                'unique_reviews': len(deduplicated_reviews),
                'processing_success_rate': len(processed_reviews) / max(len(raw_reviews), 1),
                'deduplication_rate': (len(processed_reviews) - len(deduplicated_reviews)) / max(len(processed_reviews), 1)
            },
            'quality_metrics': {
                'average_quality_score': sum(quality_scores) / max(len(quality_scores), 1),
                'high_quality_reviews': len([s for s in quality_scores if s >= 0.7]),
                'medium_quality_reviews': len([s for s in quality_scores if 0.4 <= s < 0.7]),
                'low_quality_reviews': len([s for s in quality_scores if s < 0.4])
            },
            'content_analysis': {
                'reviews_with_ratings': len(ratings),
                'average_rating': sum(ratings) / max(len(ratings), 1) if ratings else None,
                'reviews_with_demographics': len([r for r in processed_reviews if r.get('patient_demographics')]),
                'age_range': {'min': min(ages), 'max': max(ages)} if ages else None,
                'gender_distribution': dict(defaultdict(int, [(g, genders.count(g)) for g in set(genders)]))
            }
        }

# Example usage
def test_review_processor():
    """Test the review data processor"""
    processor = ReviewDataProcessor()
    
    # Sample Tavily results for testing
    sample_results = {
        'reviews': [
            {
                'title': 'Great medication - 5 stars',
                'content': 'I have been taking this medication for diabetes for 6 months. It really helped control my blood sugar. I am a 45 year old female and had no side effects.',
                'url': 'https://drugs.com/example1',
                'score': 0.9
            },
            {
                'title': 'Terrible side effects',
                'content': 'This drug gave me severe nausea and headaches. Had to stop taking it after 2 weeks. Doctor prescribed something else.',
                'url': 'https://drugs.com/example2', 
                'score': 0.8
            }
        ]
    }
    
    results = processor.process_tavily_results(sample_results)
    print(f"Processing results: {json.dumps(results, indent=2, default=str)}")
    
    return results

if __name__ == "__main__":
    test_review_processor()
