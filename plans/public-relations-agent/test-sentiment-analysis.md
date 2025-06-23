# PR Sentiment Intelligence Agent - Epic 2 Testing Guide

## Overview
This document provides testing instructions for the enhanced PR Sentiment Intelligence Agent with multi-dimensional sentiment analysis capabilities (Epic 2 implementation).

## What's New in Epic 2

### Enhanced Features
1. **Multi-Dimensional Sentiment Analysis** - 5 sentiment dimensions
2. **Comprehensive UI Components** - Rich visualization of sentiment results
3. **Enhanced InlineAgent Instructions** - Detailed sentiment analysis prompts
4. **Structured Data Processing** - JSON-based sentiment results
5. **Risk Detection Integration** - Safety signals and PR risk indicators

### User Stories Implemented
- **US-003**: Overall Sentiment Analysis
- **US-004**: Efficacy Sentiment Analysis  
- **US-005**: Side Effect Sentiment Analysis
- **US-006**: Patient Experience Sentiment Analysis
- **US-007**: Recommendation Likelihood Analysis

## Testing Instructions

### 1. Access the Application
1. Navigate to the UI application
2. Look for "PR Sentiment Intelligence Agent" in the InlineAgents section
3. Select the agent (should have green "InlineAgent" badge)
4. Click "Start Chat with Selected"

### 2. Test Basic Sentiment Analysis
**Test Input**: `Analyze sentiment for Lipitor`

**Expected Results**:
- Agent should collect patient reviews from Drugs.com
- Display data collection progress with step-by-step traces
- Show comprehensive sentiment analysis across 5 dimensions:
  - Overall Sentiment (Positive/Negative/Neutral/Mixed)
  - Efficacy Sentiment (Effective/Ineffective/Partial)
  - Side Effect Sentiment (Tolerable/Concerning/Severe)
  - Experience Sentiment (Satisfied/Neutral/Dissatisfied)
  - Recommendation Likelihood (Would/Wouldn't recommend)

### 3. Test Alternative Drug Names
Try these additional test cases:
- `Reviews for Metformin`
- `Sentiment analysis for Advil`
- `Analyze patient feedback for Tylenol`

### 4. Verify UI Components

#### Data Collection Display
- ✅ Should show "📊 Sentiment Data" section with review count
- ✅ Should display sample reviews in collapsible format
- ✅ Should show search metadata and quality metrics

#### Comprehensive Sentiment Analysis Display
- ✅ Should show "🎯 Multi-Dimensional Sentiment Analysis" section
- ✅ Should display 5 sentiment dimension cards with:
  - Color-coded borders (green=positive, red=negative, blue=neutral, orange=concerning)
  - Appropriate icons for each sentiment type
  - Confidence scores as percentages
- ✅ Should show "💡 Key Insights" section with bullet points
- ✅ Should show "🚨 Risk Indicators" section (if any risks detected)
- ✅ Should show "📋 PR Team Recommendations" section
- ✅ Should show "📈 Data Quality Metrics" section

### 5. Test Error Handling
**Test Input**: `Analyze sentiment for XYZ123InvalidDrug`

**Expected Results**:
- Should handle gracefully with appropriate error messages
- Should not crash the application
- Should provide helpful feedback to the user

### 6. Test Streaming Response
- Verify that responses stream in real-time
- Check that trace steps appear progressively
- Ensure final results are properly formatted

## Expected Sentiment Analysis Output Structure

The agent should return structured data similar to:

```json
{
  "overall_sentiment": "Mixed",
  "overall_confidence": 0.85,
  "efficacy_sentiment": "Effective", 
  "efficacy_confidence": 0.78,
  "side_effect_sentiment": "Tolerable",
  "side_effect_confidence": 0.82,
  "experience_sentiment": "Satisfied",
  "experience_confidence": 0.75,
  "recommendation_likelihood": "Would recommend",
  "recommendation_confidence": 0.80,
  "key_insights": [
    "Most patients report significant cholesterol reduction",
    "Common side effects include muscle pain and fatigue",
    "Cost concerns mentioned by 15% of reviewers"
  ],
  "risk_indicators": [
    "Increased reports of muscle pain in recent reviews",
    "Some patients discontinuing due to side effects"
  ],
  "recommendations": [
    "Address muscle pain concerns in patient education",
    "Consider cost assistance program communications",
    "Monitor for emerging safety signals"
  ],
  "quality_metrics": {
    "total_reviews": 25,
    "average_quality_score": 0.87,
    "confidence_level": 0.83,
    "data_reliability": "High"
  }
}
```

## Troubleshooting

### Common Issues

1. **No Sentiment Analysis Results**
   - Check that Lambda function is deployed and accessible
   - Verify Tavily API key is configured
   - Check CloudWatch logs for errors

2. **UI Components Not Displaying**
   - Verify that sentiment analysis data is being parsed correctly
   - Check browser console for JavaScript errors
   - Ensure CSS classes are loading properly

3. **Streaming Issues**
   - Check network connectivity
   - Verify API endpoints are responding
   - Check for CORS issues

### Debug Steps

1. **Check Browser Console**: Look for JavaScript errors
2. **Check Network Tab**: Verify API calls are successful
3. **Check Trace Steps**: Ensure all trace events are being processed
4. **Verify Data Structure**: Check that sentiment data matches expected format

## Success Criteria

✅ **Epic 2 is successful if**:
- All 5 sentiment dimensions are analyzed and displayed
- UI components render correctly with appropriate styling
- Confidence scores are shown for each sentiment category
- Key insights, risk indicators, and recommendations are displayed
- Data quality metrics are provided
- Error handling works gracefully
- Streaming responses work smoothly

## Next Steps

After Epic 2 testing is complete:
- **Epic 3**: Risk Detection & Analysis (US-008 through US-012)
- **Epic 4**: Multi-Agent Collaboration (US-013 through US-016)

## Notes

- This implementation builds on the successful Epic 1 data collection foundation
- The Lambda function (`pr-sentiment-tavily-search-processor`) handles both data collection and sentiment analysis
- The InlineAgent approach provides flexibility for dynamic sentiment analysis configuration
- All healthcare compliance and privacy guidelines are maintained
