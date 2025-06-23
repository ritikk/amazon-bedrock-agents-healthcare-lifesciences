# PR Sentiment Intelligence Agent - Epic 2: Sentiment Analysis Implementation Plan

## Overview

This document outlines the implementation plan for Epic 2: Sentiment Analysis for the PR Sentiment Intelligence Agent. The goal is to enhance the existing InlineAgent implementation to analyze patient sentiment across multiple dimensions as specified in user stories US-003 through US-007.

## Current State Analysis

### Existing Implementation
- **Data Collection**: Epic 1 has been successfully implemented with the ability to collect drug reviews from Drugs.com using Tavily API
- **InlineAgent Integration**: The UI has been integrated with Amazon Bedrock InlineAgents
- **Lambda Function**: A deployed Lambda function (`arn:aws:lambda:us-east-1:929445170179:function:pr-sentiment-tavily-search-processor`) handles data collection
- **UI Components**: The NextJS UI framework includes streaming response processing and visualization

### Limitations
- Current implementation focuses only on data collection (Epic 1)
- No sentiment analysis capabilities are currently implemented
- The InlineAgent instruction is limited to data collection tasks
- No multi-dimensional sentiment classification is available

## User Stories & Requirements

### US-003: Overall Sentiment Analysis
As a PR Director, I want the chatbot to analyze overall sentiment so that I can understand general patient perception.

**Acceptance Criteria**:
- The chatbot provides overall sentiment classification (Positive, Negative, Neutral, Mixed)
- The chatbot includes confidence scores for the classification
- The chatbot explains the reasoning behind the sentiment classification

### US-004: Efficacy Sentiment Analysis
As a PR Director, I want the chatbot to analyze efficacy sentiment so that I can understand how patients perceive the drug's effectiveness.

**Acceptance Criteria**:
- The chatbot classifies efficacy sentiment (Effective, Ineffective, Partial)
- The chatbot provides specific examples from patient reviews
- The chatbot highlights patterns in efficacy feedback

### US-005: Side Effect Sentiment Analysis
As a PR Director, I want the chatbot to analyze side effect sentiment so that I can understand patient tolerance levels.

**Acceptance Criteria**:
- The chatbot classifies side effect sentiment (Tolerable, Concerning, Severe)
- The chatbot identifies common side effects mentioned
- The chatbot provides severity context for side effects
- The chatbot flags unusual or concerning side effect patterns

### US-006: Patient Experience Sentiment Analysis
As a PR Director, I want the chatbot to analyze patient experience sentiment so that I can understand the overall patient journey.

**Acceptance Criteria**:
- The chatbot classifies experience sentiment (Satisfied, Neutral, Dissatisfied)
- The chatbot identifies key experience factors (access, cost, usability)
- The chatbot provides context about patient journey touchpoints
- The chatbot highlights experience improvement opportunities

### US-007: Recommendation Likelihood Analysis
As a PR Director, I want the chatbot to analyze recommendation likelihood so that I can understand patient advocacy potential.

**Acceptance Criteria**:
- The chatbot determines if patients would/wouldn't recommend the drug
- The chatbot explains factors influencing recommendation decisions
- The chatbot provides percentage breakdown of recommendation sentiment
- The chatbot identifies key drivers of patient recommendations

## Implementation Approach

The implementation will leverage the existing InlineAgent architecture with the following enhancements:

1. **Enhanced InlineAgent Instructions**: Update the agent instructions to include sentiment analysis capabilities
2. **Structured Output Format**: Define a standardized JSON schema for sentiment analysis results
3. **UI Enhancements**: Add visualization components for multi-dimensional sentiment analysis
4. **Streaming Response Processing**: Enhance the streaming response handler to extract and display sentiment data

