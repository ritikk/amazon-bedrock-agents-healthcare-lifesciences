# InlineAgent UI Integration Implementation Plan

## 📋 Executive Summary

This plan outlines the integration of the existing PR Sentiment Intelligence Agent (agent #22) with the NextJS UI framework to provide a seamless chatbot interface for pharmaceutical sentiment analysis using Amazon Bedrock InlineAgents.

## 🔍 Current State Analysis

### ✅ **Existing PR Sentiment Intelligence Agent (#22)**
- **Status**: Fully functional InlineAgent implementation
- **Components**: 
  - Python-based data collector with Tavily integration
  - Lambda function deployed: `arn:aws:lambda:us-east-1:929445170179:function:pr-sentiment-tavily-search-processor`
  - Comprehensive data processing and quality scoring
  - Working Jupyter notebook examples
- **Capabilities**: Drug review collection from Drugs.com, data processing, quality validation

### ✅ **Existing NextJS UI Framework**
- **Architecture**: Next.js 14 with TypeScript, Tailwind CSS, Framer Motion
- **Current Features**:
  - Agent listing and selection interface
  - Chat interface with streaming responses
  - Multi-agent collaboration support (supervisor/collaborator patterns)
  - Real-time trace visualization
  - Error handling and user feedback
- **API Structure**: `/api/agents` (listing), `/api/chat/stream` (chat interface)

### 🎯 **Integration Goal**
Create a seamless chatbot interface that allows users to interact with the PR Sentiment Intelligence InlineAgent through natural language conversations, leveraging the existing UI framework.

---

## 📋 Implementation Checklist

### Phase 1: Backend API Integration
- [x] **1.1 Create InlineAgent API Endpoint**
  - [x] Create `/ui/app/api/inline-agent/route.ts` for InlineAgent invocation
  - [x] Implement TypeScript interfaces for InlineAgent configuration
  - [x] Add error handling for InlineAgent-specific errors
  - [x] Configure AWS SDK client for bedrock-agent-runtime

- [x] **1.2 Extend Chat API for InlineAgent Support**
  - [x] Modify `/ui/app/api/chat/stream/route.ts` to detect InlineAgent requests
  - [x] Add InlineAgent invocation logic alongside existing agent chat
  - [x] Implement streaming response processing for InlineAgent
  - [x] Add session management for InlineAgent conversations

- [x] **1.3 Create InlineAgent Configuration Service**
  - [x] Create utility functions for InlineAgent configuration
  - [x] Implement dynamic action group configuration
  - [x] Add Lambda function ARN management
  - [x] Create session ID generation and management

### Phase 2: Frontend UI Components
- [x] **2.1 Create InlineAgent Selection Interface**
  - [x] Add "InlineAgent" category to agent listing
  - [x] Create PR Sentiment Intelligence agent card with special styling
  - [x] Add InlineAgent-specific metadata display
  - [x] Implement selection logic for InlineAgent vs traditional agents

- [x] **2.2 Enhance Chat Interface for InlineAgent**
  - [x] Add InlineAgent-specific chat indicators
  - [x] Create drug name input validation
  - [x] Add progress indicators for data collection
  - [x] Implement result visualization components

- [x] **2.3 Create Sentiment Analysis Results Display**
  - [x] Design sentiment analysis result cards
  - [x] Add data visualization components (charts, graphs)
  - [x] Create review summary displays
  - [x] Implement quality metrics visualization

### Phase 3: InlineAgent Integration Logic
- [x] **3.1 Implement InlineAgent Invocation**
  - [x] Create InlineAgent service class in TypeScript
  - [x] Implement streaming response processing
  - [x] Add error handling and retry logic
  - [x] Configure action groups and Lambda integration

- [x] **3.2 Add Session Management**
  - [x] Implement session persistence for InlineAgent conversations
  - [x] Add session cleanup and timeout handling
  - [x] Create session state management
  - [x] Implement conversation history

- [x] **3.3 Create Data Processing Pipeline**
  - [x] Implement client-side data processing utilities
  - [x] Add data validation and quality checks
  - [x] Create result formatting and display logic
  - [x] Implement export functionality for results

### Phase 7: Deployment & Documentation
- [x] **7.1 Deployment**
  - [x] Configure production environment variables
  - [x] Deploy updated UI with InlineAgent support
  - [x] Set up monitoring and logging
  - [x] Configure security and access controls

- [x] **7.2 Documentation**
  - [x] Create user guide for InlineAgent features
  - [x] Document API endpoints and interfaces
  - [x] Create developer documentation
  - [x] Add troubleshooting guides

---

## 🏗️ Technical Architecture

### InlineAgent Integration Flow
```
User Input → NextJS UI → InlineAgent API → Bedrock InlineAgent → Lambda Function → Tavily API → Data Processing → UI Display
```

### Key Components to Create

#### 1. **InlineAgent Service (`/ui/lib/inline-agent-service.ts`)**
```typescript
interface InlineAgentConfig {
  sessionId: string;
  foundationModel: string;
  instruction: string;
  actionGroups: ActionGroup[];
  inputText: string;
}

class InlineAgentService {
  async invokeAgent(config: InlineAgentConfig): Promise<StreamingResponse>
  async processStreamingResponse(response: any): Promise<ProcessedResult>
}
```

#### 2. **API Endpoints**
- `/api/inline-agent/invoke` - InlineAgent invocation
- `/api/inline-agent/session` - Session management
- `/api/inline-agent/results` - Result processing

#### 3. **UI Components**
- `InlineAgentCard` - Agent selection component
- `SentimentAnalysisResults` - Results display
- `DrugAnalysisChat` - Specialized chat interface
- `ProgressTracker` - Real-time progress display

### Data Flow Architecture
```
1. User selects PR Sentiment Intelligence Agent
2. UI creates InlineAgent configuration
3. User inputs drug name via chat
4. System invokes InlineAgent with Tavily action group
5. Lambda function collects data from Drugs.com
6. InlineAgent processes and analyzes data
7. Results stream back to UI in real-time
8. UI displays formatted sentiment analysis
```

---

## 🔧 Prerequisites

### Environment Setup
- [ ] Ensure Tavily API key is configured
- [ ] Verify Lambda function is deployed and accessible
- [ ] Confirm Bedrock model access for Claude 3.5 Haiku
- [ ] Set up development environment with proper AWS credentials

### Dependencies
- [ ] AWS SDK for JavaScript/TypeScript
- [ ] Existing NextJS UI framework
- [ ] Working PR Sentiment Intelligence Agent (#22)
- [ ] Deployed Lambda function for Tavily integration

---

## 📝 Notes

1. **Leverage Existing Infrastructure**: The PR Sentiment Intelligence Agent (#22) is fully functional, so focus on UI integration rather than rebuilding core functionality.

2. **Follow Existing Patterns**: The NextJS UI already supports traditional agents and multi-agent collaboration, so extend these patterns for InlineAgent support.

3. **Maintain Consistency**: Ensure InlineAgent integration follows the same design patterns and user experience as existing agent interactions.

4. **Performance Considerations**: InlineAgent invocation may take longer than traditional agent calls due to data collection, so implement proper progress tracking.

5. **Error Handling**: InlineAgent errors may be different from traditional agent errors, so implement specific error handling and user feedback.

This plan provides a comprehensive roadmap for integrating the existing PR Sentiment Intelligence InlineAgent with the NextJS UI framework, creating a seamless pharmaceutical sentiment analysis chatbot experience.
