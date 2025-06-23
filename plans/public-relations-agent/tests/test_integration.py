#!/usr/bin/env python3
"""
Integration test for PR Sentiment Data Collection Epic 1
Tests the complete data collection pipeline using InlineAgent
"""

import sys
import os
import json
import boto3
from datetime import datetime

# Add src directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from pr_sentiment_data_collector import PRSentimentDataCollector, DataCollectionError
from review_data_processor import ReviewDataProcessor

class IntegrationTester:
    """Integration test suite for Epic 1 data collection"""
    
    def __init__(self, lambda_function_arn: str, region: str = 'us-east-1'):
        self.lambda_function_arn = lambda_function_arn
        self.region = region
        self.collector = PRSentimentDataCollector(region_name=region)
        self.processor = ReviewDataProcessor()
        self.test_results = []
    
    def run_all_tests(self):
        """Run all integration tests"""
        print("🧪 Starting PR Sentiment Data Collection Integration Tests")
        print("=" * 60)
        
        # Test 1: Basic data collection
        self.test_basic_data_collection()
        
        # Test 2: Data processing and validation
        self.test_data_processing()
        
        # Test 3: Error handling
        self.test_error_handling()
        
        # Test 4: End-to-end workflow
        self.test_end_to_end_workflow()
        
        # Print summary
        self.print_test_summary()
        
        return all(result['passed'] for result in self.test_results)
    
    def test_basic_data_collection(self):
        """Test basic data collection functionality"""
        print("\n📊 Test 1: Basic Data Collection")
        print("-" * 40)
        
        try:
            # Test with a common drug
            drug_name = "Lipitor"
            max_results = 5
            
            print(f"Collecting reviews for: {drug_name}")
            print(f"Max results: {max_results}")
            
            results = self.collector.collect_drug_reviews(
                drug_name=drug_name,
                max_results=max_results,
                lambda_function_arn=self.lambda_function_arn
            )
            
            # Validate results
            success = self.validate_collection_results(results, drug_name)
            
            self.test_results.append({
                'test_name': 'Basic Data Collection',
                'passed': success,
                'details': results.get('collection_metadata', {}),
                'error': None
            })
            
            if success:
                print("✅ Basic data collection test PASSED")
            else:
                print("❌ Basic data collection test FAILED")
                
        except Exception as e:
            print(f"❌ Basic data collection test FAILED: {str(e)}")
            self.test_results.append({
                'test_name': 'Basic Data Collection',
                'passed': False,
                'details': {},
                'error': str(e)
            })
    
    def test_data_processing(self):
        """Test data processing and validation"""
        print("\n🔄 Test 2: Data Processing")
        print("-" * 40)
        
        try:
            # Create sample Tavily results for processing
            sample_results = {
                'status': 'success',
                'reviews': [
                    {
                        'title': 'Great medication for cholesterol - 5/5 stars',
                        'content': 'I have been taking Lipitor for my high cholesterol for 2 years. It really helped lower my cholesterol levels. I am a 52 year old male and experienced only minor muscle aches initially. My doctor says my numbers look great now.',
                        'url': 'https://drugs.com/comments/atorvastatin/lipitor-for-high-cholesterol.html',
                        'score': 0.9
                    },
                    {
                        'title': 'Side effects were too much',
                        'content': 'Started taking this for diabetes but had to stop after 3 weeks. Severe nausea and headaches made it impossible to continue. Doctor switched me to a different medication.',
                        'url': 'https://drugs.com/comments/metformin/for-diabetes.html',
                        'score': 0.7
                    }
                ]
            }
            
            print("Processing sample review data...")
            processed_results = self.processor.process_tavily_results(sample_results)
            
            # Validate processing results
            success = self.validate_processing_results(processed_results)
            
            self.test_results.append({
                'test_name': 'Data Processing',
                'passed': success,
                'details': processed_results.get('metadata', {}),
                'error': None
            })
            
            if success:
                print("✅ Data processing test PASSED")
                print(f"   - Processed {processed_results['metadata']['total_unique_reviews']} unique reviews")
                print(f"   - Success rate: {processed_results['metadata']['processing_success_rate']:.2%}")
            else:
                print("❌ Data processing test FAILED")
                
        except Exception as e:
            print(f"❌ Data processing test FAILED: {str(e)}")
            self.test_results.append({
                'test_name': 'Data Processing',
                'passed': False,
                'details': {},
                'error': str(e)
            })
    
    def test_error_handling(self):
        """Test error handling scenarios"""
        print("\n⚠️  Test 3: Error Handling")
        print("-" * 40)
        
        error_tests = [
            {
                'name': 'Empty drug name',
                'drug_name': '',
                'expected_error': 'Drug name cannot be empty'
            },
            {
                'name': 'Invalid Lambda ARN',
                'drug_name': 'TestDrug',
                'lambda_arn': 'invalid-arn',
                'expected_error': 'Lambda function ARN'
            }
        ]
        
        passed_tests = 0
        
        for test in error_tests:
            try:
                print(f"Testing: {test['name']}")
                
                lambda_arn = test.get('lambda_arn', self.lambda_function_arn)
                
                # This should raise an exception
                self.collector.collect_drug_reviews(
                    drug_name=test['drug_name'],
                    max_results=5,
                    lambda_function_arn=lambda_arn
                )
                
                print(f"   ❌ Expected error but got success")
                
            except DataCollectionError as e:
                if test['expected_error'] in str(e):
                    print(f"   ✅ Correctly caught expected error")
                    passed_tests += 1
                else:
                    print(f"   ❌ Wrong error message: {str(e)}")
            except Exception as e:
                print(f"   ❌ Unexpected error type: {str(e)}")
        
        success = passed_tests == len(error_tests)
        
        self.test_results.append({
            'test_name': 'Error Handling',
            'passed': success,
            'details': {'passed_tests': passed_tests, 'total_tests': len(error_tests)},
            'error': None
        })
        
        if success:
            print("✅ Error handling test PASSED")
        else:
            print("❌ Error handling test FAILED")
    
    def test_end_to_end_workflow(self):
        """Test complete end-to-end workflow"""
        print("\n🔄 Test 4: End-to-End Workflow")
        print("-" * 40)
        
        try:
            drug_name = "Metformin"
            print(f"Testing complete workflow for: {drug_name}")
            
            # Step 1: Collect data
            print("Step 1: Collecting data...")
            collection_results = self.collector.collect_drug_reviews(
                drug_name=drug_name,
                max_results=3,
                lambda_function_arn=self.lambda_function_arn
            )
            
            # Step 2: Validate collection
            print("Step 2: Validating collection...")
            validation_results = self.collector.validate_collection_results(collection_results)
            
            # Step 3: Process structured data if available
            structured_data = collection_results.get('structured_data')
            if structured_data:
                print("Step 3: Processing structured data...")
                processing_results = self.processor.process_tavily_results(structured_data)
            else:
                print("Step 3: No structured data to process")
                processing_results = {'status': 'no_data'}
            
            # Evaluate overall success
            collection_success = collection_results.get('status') == 'completed'
            validation_success = validation_results.get('is_valid', False)
            processing_success = processing_results.get('status') == 'success'
            
            overall_success = collection_success and (validation_success or processing_success)
            
            self.test_results.append({
                'test_name': 'End-to-End Workflow',
                'passed': overall_success,
                'details': {
                    'collection_success': collection_success,
                    'validation_success': validation_success,
                    'processing_success': processing_success,
                    'validation_quality_score': validation_results.get('quality_score', 0)
                },
                'error': None
            })
            
            if overall_success:
                print("✅ End-to-end workflow test PASSED")
                print(f"   - Collection: {'✅' if collection_success else '❌'}")
                print(f"   - Validation: {'✅' if validation_success else '❌'}")
                print(f"   - Processing: {'✅' if processing_success else '❌'}")
            else:
                print("❌ End-to-end workflow test FAILED")
                
        except Exception as e:
            print(f"❌ End-to-end workflow test FAILED: {str(e)}")
            self.test_results.append({
                'test_name': 'End-to-End Workflow',
                'passed': False,
                'details': {},
                'error': str(e)
            })
    
    def validate_collection_results(self, results: dict, expected_drug: str) -> bool:
        """Validate collection results"""
        if results.get('status') != 'completed':
            print(f"   ❌ Status not completed: {results.get('status')}")
            return False
        
        if results.get('drug_name') != expected_drug:
            print(f"   ❌ Drug name mismatch: expected {expected_drug}, got {results.get('drug_name')}")
            return False
        
        if not results.get('raw_response'):
            print(f"   ❌ No raw response data")
            return False
        
        print(f"   ✅ Collection completed successfully")
        print(f"   ✅ Response length: {len(results.get('raw_response', ''))}")
        
        return True
    
    def validate_processing_results(self, results: dict) -> bool:
        """Validate processing results"""
        if results.get('status') != 'success':
            print(f"   ❌ Processing status not success: {results.get('status')}")
            return False
        
        reviews = results.get('reviews', [])
        if not reviews:
            print(f"   ❌ No reviews in processed results")
            return False
        
        # Check review structure
        for i, review in enumerate(reviews[:2]):  # Check first 2 reviews
            required_fields = ['id', 'content', 'quality_metrics', 'metadata']
            for field in required_fields:
                if field not in review:
                    print(f"   ❌ Review {i} missing required field: {field}")
                    return False
        
        print(f"   ✅ Processing completed successfully")
        print(f"   ✅ Processed {len(reviews)} reviews")
        
        return True
    
    def print_test_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['passed'])
        total = len(self.test_results)
        
        print(f"Tests passed: {passed}/{total}")
        print(f"Success rate: {passed/total:.1%}")
        
        for result in self.test_results:
            status = "✅ PASS" if result['passed'] else "❌ FAIL"
            print(f"{status} - {result['test_name']}")
            if result['error']:
                print(f"      Error: {result['error']}")
        
        if passed == total:
            print("\n🎉 All tests passed! Epic 1 implementation is working correctly.")
        else:
            print(f"\n⚠️  {total - passed} test(s) failed. Please review the implementation.")

def main():
    """Main test runner"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Run Epic 1 integration tests')
    parser.add_argument('--lambda-arn', required=True, help='Lambda function ARN for Tavily search')
    parser.add_argument('--region', default='us-east-1', help='AWS region')
    
    args = parser.parse_args()
    
    # Run tests
    tester = IntegrationTester(args.lambda_arn, args.region)
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
