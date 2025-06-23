// lib/inline-agent-service.ts
import { BedrockAgentRuntimeClient, InvokeInlineAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';

export interface ActionGroup {
  actionGroupName: string;
  description?: string;
  parentActionGroupSignature?: string;
  actionGroupExecutor?: {
    lambda: string;
  };
  apiSchema?: {
    payload: string;
  };
}

export interface InlineAgentConfig {
  sessionId: string;
  foundationModel: string;
  instruction: string;
  actionGroups?: ActionGroup[];
  inputText: string;
  enableTrace?: boolean;
  idleSessionTTLInSeconds?: number;
  guardrailConfiguration?: {
    guardrailIdentifier: string;
    guardrailVersion: string;
  };
}

export interface ProcessedResult {
  status: string;
  data: string;
  sessionId: string;
  structured_data?: any;
  processing_summary?: any;
}

export class InlineAgentService {
  private client: BedrockAgentRuntimeClient;
  private region: string;

  constructor(region: string = 'us-east-1') {
    this.region = region;
    this.client = new BedrockAgentRuntimeClient({ region });
  }

  async invokeAgent(config: InlineAgentConfig): Promise<any> {
    try {
      const command = new InvokeInlineAgentCommand({
        sessionId: config.sessionId,
        foundationModel: config.foundationModel,
        instruction: config.instruction,
        inputText: config.inputText,
        actionGroups: config.actionGroups,
        enableTrace: config.enableTrace || true,
        idleSessionTTLInSeconds: config.idleSessionTTLInSeconds || 3600,
        guardrailConfiguration: config.guardrailConfiguration,
      });

      const response = await this.client.send(command);
      return response;
    } catch (error) {
      console.error('InlineAgent invocation failed:', error);
      throw error;
    }
  }

  async processStreamingResponse(response: any): Promise<ProcessedResult> {
    const results: string[] = [];
    let structured_data: any = null;
    let processing_summary: any = null;
    
    try {
      if (response.completion) {
        for await (const event of response.completion) {
          if (event.chunk?.bytes) {
            const text = new TextDecoder().decode(event.chunk.bytes);
            results.push(text);
            
            // Try to parse structured data from the response
            try {
              const parsed = JSON.parse(text);
              if (parsed.structured_data) {
                structured_data = parsed.structured_data;
              }
              if (parsed.processing_summary) {
                processing_summary = parsed.processing_summary;
              }
            } catch (parseError) {
              // Not JSON, continue with text processing
            }
          }
          
          if (event.trace) {
            console.log('InlineAgent Trace:', event.trace);
          }
        }
      }
      
      return {
        status: 'completed',
        data: results.join(''),
        sessionId: response.sessionId || 'unknown',
        structured_data,
        processing_summary
      };
    } catch (error) {
      console.error('Error processing streaming response:', error);
      return {
        status: 'error',
        data: `Error processing response: ${error}`,
        sessionId: response.sessionId || 'unknown'
      };
    }
  }

  // Create PR Sentiment Intelligence Agent configuration
  createPRSentimentAgentConfig(drugName: string, maxResults: number = 20, lambdaArn: string): InlineAgentConfig {
    const sessionId = `pr-sentiment-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    return {
      sessionId,
      foundationModel: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      instruction: `You are a pharmaceutical sentiment analysis specialist that collects and analyzes patient reviews to provide comprehensive, human-readable sentiment intelligence reports.

Your comprehensive task is to:
1. Use the TavilySearchProcessor function to search for patient reviews of "${drugName}" on Drugs.com
2. Collect and process the review data with high quality standards
3. Perform multi-dimensional sentiment analysis across 5 key dimensions
4. Present your findings in a clear, descriptive, conversational format

**IMPORTANT: Your response should be a comprehensive, human-readable analysis report, NOT raw JSON data.**

Structure your response as follows:

## 📊 Sentiment Analysis Report for ${drugName}

### Data Collection Summary
[Describe how many reviews were found, data quality, and collection process]

### 🎯 Multi-Dimensional Sentiment Analysis

**Overall Patient Sentiment: [Classification]** (Confidence: [X]%)
[Provide 2-3 sentences explaining the overall sentiment with specific examples from reviews]

**Drug Efficacy Perception: [Classification]** (Confidence: [X]%)
[Explain how patients perceive the drug's effectiveness with supporting evidence]

**Side Effect Tolerance: [Classification]** (Confidence: [X]%)
[Describe patient experiences with side effects and tolerance levels]

**Patient Experience: [Classification]** (Confidence: [X]%)
[Analyze the overall patient journey including access, cost, and usability factors]

**Recommendation Likelihood: [Classification]** (Confidence: [X]%)
[Explain whether patients would recommend this drug to others and why]

### 💡 Key Insights
[Provide 3-5 bullet points of the most important findings from the analysis]

### 🚨 Risk Indicators (if any)
[List any concerning patterns or safety signals that require attention]

### 📋 Recommendations for PR Team
[Provide 3-5 actionable recommendations based on the sentiment analysis]

### 📈 Data Quality Assessment
[Summarize the reliability and confidence level of the analysis]

Always maintain compliance with platform terms of service and data privacy guidelines.
Focus on providing clear, actionable insights that help pharmaceutical companies understand real patient experiences.`,
      
      actionGroups: [
        {
          actionGroupName: 'TavilySearchProcessor',
          description: 'Search for drug reviews on Drugs.com using Tavily API and process results',
          actionGroupExecutor: {
            lambda: lambdaArn
          },
          apiSchema: {
            payload: JSON.stringify({
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
                        "required": true,
                        "schema": {"type": "string"}
                      },
                      {
                        "name": "max_results",
                        "in": "query", 
                        "description": "Maximum number of results to return",
                        "required": false,
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
      
      inputText: `Please search for patient reviews of "${drugName}" on Drugs.com and provide a comprehensive sentiment analysis report. 

I need a detailed, human-readable analysis that includes:
1. Data collection summary with review count and quality assessment
2. Multi-dimensional sentiment analysis across all 5 dimensions with confidence scores
3. Clear explanations and specific examples from patient reviews
4. Key insights and patterns identified in the feedback
5. Risk indicators and safety signals (if any)
6. Actionable recommendations for pharmaceutical PR teams
7. Data quality and reliability assessment

Please format your response as a comprehensive report with clear sections and descriptive explanations, NOT as raw JSON data. Make it conversational and easy to understand for PR professionals.`,
      
      enableTrace: true,
      idleSessionTTLInSeconds: 3600
      
      // Remove guardrail configuration for now - can be added later if needed
      // guardrailConfiguration: {
      //   guardrailIdentifier: 'healthcare-compliance-guardrail',
      //   guardrailVersion: '1.0'
      // }
    };
  }

  // Validate drug name input
  validateDrugName(drugName: string): { isValid: boolean; error?: string } {
    if (!drugName || !drugName.trim()) {
      return { isValid: false, error: 'Drug name cannot be empty' };
    }
    
    if (drugName.trim().length < 2) {
      return { isValid: false, error: 'Drug name must be at least 2 characters long' };
    }
    
    if (drugName.trim().length > 100) {
      return { isValid: false, error: 'Drug name cannot exceed 100 characters' };
    }
    
    // Basic validation for potentially harmful input
    const invalidChars = /[<>\"'&]/;
    if (invalidChars.test(drugName)) {
      return { isValid: false, error: 'Drug name contains invalid characters' };
    }
    
    return { isValid: true };
  }

  // Generate session ID
  generateSessionId(prefix: string = 'inline-agent'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}

export default InlineAgentService;
