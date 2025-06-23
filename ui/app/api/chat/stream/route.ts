import { NextRequest } from 'next/server';
import {
  BedrockAgentRuntimeClient,
  InvokeInlineAgentCommand
} from '@aws-sdk/client-bedrock-agent-runtime';
import {
  BedrockAgentClient,
  ListAgentAliasesCommand,
  GetAgentAliasCommand
} from '@aws-sdk/client-bedrock-agent';
import { a, p } from 'framer-motion/client';

import dotenv from "dotenv";
dotenv.config();

const REGION: string = process.env.AWS_REGION


const runtimeClient = new BedrockAgentRuntimeClient({ region: REGION });
const controlClient = new BedrockAgentClient({ region: REGION });

const LAMBDA_FUNCTION_ARN = 'arn:aws:lambda:us-east-1:929445170179:function:pr-sentiment-tavily-search-processor';

// Handler for PR Sentiment Intelligence InlineAgent
async function handlePRSentimentInlineAgent(req: NextRequest, encoder: TextEncoder, sessionId: string, message: string, log: Function) {
  log('Handling PR Sentiment Intelligence InlineAgent request');
  
  try {
    // Extract drug name from message
    const drugName = extractDrugNameFromMessage(message);
    if (!drugName) {
      return createErrorResponse(encoder, 'Please specify a drug name to analyze. For example: "Analyze sentiment for Lipitor"');
    }

    log('Extracted drug name:', drugName);

    // Create InlineAgent configuration for PR Sentiment Intelligence
    const requestParams = {
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
            lambda: LAMBDA_FUNCTION_ARN
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
      endSession: false
    };

    log('Invoking PR Sentiment InlineAgent', requestParams);
    const result = await invokeInlineAgentHelper(requestParams);
    log('PR Sentiment InlineAgent invocation started');

    return createPRSentimentStream(encoder, result, sessionId, drugName, log);

  } catch (error) {
    log('Error in PR Sentiment InlineAgent handler:', error);
    return createErrorResponse(encoder, `Failed to analyze sentiment for drug: ${error.message}`);
  }
}

// Extract drug name from user message
function extractDrugNameFromMessage(message: string): string | null {
  // Simple patterns to extract drug names
  const patterns = [
    /analyze sentiment for (.+?)(?:\s|$)/i,
    /sentiment analysis for (.+?)(?:\s|$)/i,
    /reviews for (.+?)(?:\s|$)/i,
    /drug (.+?)(?:\s|$)/i,
    /medication (.+?)(?:\s|$)/i,
    /"([^"]+)"/,  // Quoted drug name
    /\b([A-Z][a-z]+(?:in|ol|ex|ide|ate|ine|one|ium)?)\b/  // Common drug name patterns
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // If no pattern matches, check if the message is just a drug name
  const words = message.trim().split(/\s+/);
  if (words.length === 1 && words[0].length > 2) {
    return words[0];
  }

  return null;
}

// Create streaming response for PR Sentiment Intelligence
function createPRSentimentStream(encoder: TextEncoder, result: any, sessionId: string, drugName: string, log: Function) {
  const stream = new ReadableStream({
    async start(controller) {
      let finalMessage = '';
      let step = 1;

      try {
        // Send initial status
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'status',
          step: step++,
          agent: 'PR Sentiment Intelligence',
          text: `Starting sentiment analysis for "${drugName}"...`
        })}\n\n`));

        for await (const event of result.completion) {
          if (event.chunk?.bytes) {
            const text = new TextDecoder('utf-8').decode(event.chunk.bytes);
            finalMessage += text;
            log('Received chunk', { text });

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'chunk', 
              data: text 
            })}\n\n`));
          }

          if (event.trace?.trace?.orchestrationTrace) {
            const trace = event.trace.trace.orchestrationTrace;
            log('Processing orchestration trace', trace);

            const toolInput = trace.invocationInput?.actionGroupInvocationInput;
            if (toolInput) {
              log('Tool input received', toolInput);

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'tool',
                step: step++,
                agent: 'Tavily Search Processor',
                function: toolInput.function || 'search-drug-reviews',
                apiPath: toolInput.apiPath || '/search-drug-reviews',
                parameters: toolInput.parameters || [],
                text: `Searching for "${drugName}" reviews on Drugs.com...`
              })}\n\n`));
            }

            if (trace.rationale?.text) {
              log('Rationale received', trace.rationale.text);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'rationale',
                step: step++,
                agent: 'PR Sentiment Intelligence',
                text: trace.rationale.text
              })}\n\n`));
            }

            const obsTool = trace.observation?.actionGroupInvocationOutput?.text;
            if (obsTool) {
              log(`Tool observation received`, obsTool);
              
              // Try to parse structured data from the observation
              let structuredData = null;
              try {
                structuredData = JSON.parse(obsTool);
              } catch (parseError) {
                // Not JSON, treat as text
              }

              if (structuredData && structuredData.total_reviews) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'sentiment-data',
                  step: step++,
                  agent: 'Data Processor',
                  text: `Found ${structuredData.total_reviews} reviews for analysis`,
                  data: structuredData
                })}\n\n`));
              } else {
                const obs_chunks = chunkTextSafely(obsTool, 4000);
                for (const obs_chunk of obs_chunks) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'observation',
                    step: step++,
                    agent: 'Tavily Search Processor',
                    text: obs_chunk
                  })}\n\n`));
                }
              }
            }
          }
        }

      } catch (streamError) {
        log('Error during streaming', streamError);
        
        let errorMessage = 'An error occurred during sentiment analysis.';
        if (streamError instanceof Error) {
          errorMessage = streamError.message || errorMessage;
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          step: step++,
          agent: 'PR Sentiment Intelligence',
          message: errorMessage,
          text: `Error: ${errorMessage}`
        })}\n\n`));

        finalMessage = `Error: ${errorMessage}. Request ID: ${sessionId}`;
      } finally {
        const endPayload = {
          type: 'end',
          finalMessage,
          requestId: sessionId,
          drugName
        };
        log('Streaming final message and closing connection', endPayload);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(endPayload)}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Transfer-Encoding': 'chunked'
    }
  });
}

// Create error response
function createErrorResponse(encoder: TextEncoder, errorMessage: string) {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'error',
        message: errorMessage,
        text: `Error: ${errorMessage}`
      })}\n\n`));
      
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'end',
        finalMessage: errorMessage
      })}\n\n`));
      
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    }
  });
}

export async function getAgentAliasArnByName(agentId) {
  try {
    const listCommand = new ListAgentAliasesCommand({ agentId });
    const listResponse = await controlClient.send(listCommand);
    const latestAlias = listResponse.agentAliasSummaries?.sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    )[0];
    if (!latestAlias) return null;

    const getCommand = new GetAgentAliasCommand({
      agentId,
      agentAliasId: latestAlias.agentAliasId
    });
    const getResponse = await controlClient.send(getCommand);
    return getResponse.agentAlias?.agentAliasArn;
  } catch (error) {
    console.error('Error getting alias ARN:', error);
    throw error;
  }
}

export async function invokeInlineAgentHelper(requestParams) {
  try {
    const command = new InvokeInlineAgentCommand(requestParams);
    const response = await runtimeClient.send(command);
    return response;
  } catch (error) {
    console.error('Error invoking inline agent:', error);
    throw error;
  }
}

function extractAndRemoveImageUrls(text: string): [string[], string] {
  const imageUrlRegex = /(https:\/\/[^\s"']+\.(?:png|jpg|jpeg|webp)[^\s"']*)/gi;
  const allImageUrls = [...text.matchAll(imageUrlRegex)].map(match => match[1]);
  
  // Filter to only allow S3 URLs and other trusted domains
  const allowedDomains = [
    's3.amazonaws.com',
    's3.',  // Matches s3.region.amazonaws.com patterns
    'amazonaws.com'
  ];
  
  const filteredImageUrls = allImageUrls.filter(url => {
    return allowedDomains.some(domain => url.includes(domain));
  });
  
  // Remove ALL image URLs from text (both allowed and filtered)
  const cleanedText = text.replace(imageUrlRegex, '').trim();
  return [filteredImageUrls, cleanedText];
}


function chunkTextSafely(text: string, size: number = 3000): string[] {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    let chunk = text.slice(i, i + size).trim();
    if (i > 0) chunk = '... ' + chunk;            
    if (i + size < text.length) chunk += ' ...';  
    chunks.push(chunk);
  }
  return chunks;
}


export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const { message, agents, agent_instruction, requestId, inline_agent_type } = await req.json();
  const sessionId = requestId || `session-${Date.now()}`;

  const log = (msg: string, ...args: any[]) => {
    console.log(`[${sessionId}] ${msg}`, ...args);
  };

  log('Received chat request', { message, agent_instruction, agentCount: agents.length, inline_agent_type });

  // Check if this is a PR Sentiment Intelligence InlineAgent request
  const isPRSentimentAgent = inline_agent_type === 'pr-sentiment' || 
    agents.some(agent => agent.name?.toLowerCase().includes('pr sentiment') || 
                        agent.name?.toLowerCase().includes('sentiment intelligence'));

  if (isPRSentimentAgent) {
    return handlePRSentimentInlineAgent(req, encoder, sessionId, message, log);
  }

  try {
    const foundationModel = 'us.anthropic.claude-3-5-haiku-20241022-v1:0';

    log('Resolving agent aliases...');
    const collaboratorConfigurations = await Promise.all(
      agents.map(async (agent) => {
        const agentAliasArn = await getAgentAliasArnByName(agent.id || agent.name);
        log(`Resolved agent "${agent.name}" to ARN`, agentAliasArn);
        return {
          collaboratorName: agent.name,
          collaboratorInstruction: agent_instruction,
          agentAliasArn,
          relayConversationHistory: 'TO_COLLABORATOR'
        };
      })
    );

    const requestParams = {
      foundationModel,
      instruction: agent_instruction,
      sessionId,
      endSession: false,
      enableTrace: true,
      agentCollaboration: 'SUPERVISOR_ROUTER',
      inputText: message,
      collaboratorConfigurations,
      inlineSessionState: {
        promptSessionAttributes: {
          today: new Date().toISOString().split('T')[0],
        },
      },
    };

    log('Invoking agent collaboration', requestParams);
    const result = await invokeInlineAgentHelper(requestParams);
    log('Agent invocation started');

    const stream = new ReadableStream({
      async start(controller) {
        let finalMessage = '';
        let imageUrls: string[] = [];
        let step = 1;
        let inputTokens = 0;
        let outputTokens = 0;

        try {
          for await (const event of result.completion) {
  
            const agentId = event.trace?.agentId || 'unknown-agent';
  
            if (event.chunk?.bytes) {
              const text = new TextDecoder('utf-8').decode(event.chunk.bytes);
              finalMessage += text;
              log('Received chunk', { text });
  
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', data: text })}\n\n`));
            }
  
            if (event.trace?.trace?.orchestrationTrace) {
              const trace = event.trace.trace.orchestrationTrace;
              log('Processing orchestration trace', trace);
  
              const toolInput = trace.invocationInput?.actionGroupInvocationInput;
              if (toolInput) {
                log('Tool input received', toolInput);
  
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'tool',
                  step,
                  agent: agentId,
                  function: toolInput.function || '',
                  apiPath: toolInput.apiPath || '',
                  executionType: toolInput.executionType || '',
                  parameters: toolInput.parameters || []
                })}\n\n`));
  
                // if(toolInput.executionType === 'RETURN_CONTROL') {
                //   if(toolInput.function === 'showImage'){
                //     imageUrl = toolInput.parameters[0].value;
                //     break;
                //   }
                // } else {
                //   controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                //     type: 'tool',
                //     step,
                //     agent: agentId,
                //     function: toolInput.function || '',
                //     apiPath: toolInput.apiPath || '',
                //     executionType: toolInput.executionType || '',
                //     parameters: toolInput.parameters || []
                //   })}\n\n`));
                // }
                step++;
              }
  
              if (trace.rationale?.text) {
                log('Rationale received', trace.rationale.text);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'rationale',
                  step,
                  agent: "Model",
                  text: trace.rationale.text
                })}\n\n`));
                step++;
              }
  
              const agentColab = trace.invocationInput?.agentCollaboratorInvocationInput;
              if (agentColab) {
                log(`Agent collaborator input from "${agentColab.agentCollaboratorName}"`, agentColab.input.text);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'agent-collaborator',
                  step,
                  agent: agentColab.agentCollaboratorName,
                  text: agentColab.input.text
                })}\n\n`));
                step++;
              }
  
              const obsTool = trace.observation?.actionGroupInvocationOutput?.text;
              if (obsTool) {
                log(`Tool observation from "${agentId}"`, obsTool);
  
                // Skip image extraction for web search agents to avoid external URLs
                const isWebSearchAgent = agentId.toLowerCase().includes('tavily') || 
                                       agentId.toLowerCase().includes('web-search') ||
                                       agentId.toLowerCase().includes('websearch');
                
                if (!isWebSearchAgent) {
                  const [extractedUrls, cleanedText] = extractAndRemoveImageUrls(obsTool);
                  if (extractedUrls.length > 0) {
                    imageUrls.push(...extractedUrls);
                    log('Image URLs captured from observation text', extractedUrls);
                  }
                  
                  const obs_chunks = chunkTextSafely(cleanedText, 4000);
                  for (const obs_chunk of obs_chunks) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: 'observation',
                      step,
                      agent: agentId,
                      text: obs_chunk
                    })}\n\n`));
                  }
                } else {
                  // For web search agents, don't extract images, just chunk the text
                  const obs_chunks = chunkTextSafely(obsTool, 4000);
                  for (const obs_chunk of obs_chunks) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: 'observation',
                      step,
                      agent: agentId,
                      text: obs_chunk
                    })}\n\n`));
                  }
                }
                step++;
              }

              const kbOutput = trace.observation?.knowledgeBaseLookupOutput;
              if (kbOutput?.retrievedReferences?.length) {
                log('Knowledge Base lookup retrieved references', kbOutput.retrievedReferences);
              
                for (const reference of kbOutput.retrievedReferences) {
                  console.log('Reference Object:', JSON.stringify(reference, null, 2));
              
                  const metadata = reference.metadata || {};
                  const sourceUri = metadata['x-amz-bedrock-kb-source-uri'] || '';
                  const contentText = reference.content?.text || '';
              
                  if (contentText) {
                    const combinedText = `${contentText}\n\nReference: ${sourceUri}`;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: 'knowledge-base',  
                      step,
                      agent: agentId,
                      text: combinedText
                    })}\n\n`));
                  }
                }
                step++;
                
              }                            
              const finalResp = trace.observation?.finalResponse;
              if (finalResp?.text) {
                log(`Final response from "${agentId}"`, finalResp.text);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'observation',
                  step,
                  agent: agentId,
                  text: finalResp.text
                })}\n\n`));
                step++;
              }
  
              const usage = trace.modelInvocationOutput?.metadata?.usage;
              if (usage) {
                inputTokens += usage.inputTokens || 0;
                outputTokens += usage.outputTokens || 0;
                log('Model usage stats', usage);
              }
  
              const attachment = finalResp?.attachments?.[0];
              if (attachment?.url) {
                imageUrls.push(attachment.url);
                log('Image URL captured from response', attachment.url);
              }
            }
          }
  
        } catch (streamError) {
          log('Error during streaming', streamError);
          
          // Extract meaningful error information
          let errorMessage = 'An error occurred during streaming.';
          let errorDetails = '';
          
          if (streamError instanceof Error) {
            errorMessage = streamError.message || errorMessage;
            errorDetails = streamError.stack || '';
          } else if (typeof streamError === 'string') {
            errorMessage = streamError;
          } else if (streamError && typeof streamError === 'object') {
            errorMessage = streamError.message || streamError.toString() || errorMessage;
            errorDetails = JSON.stringify(streamError, null, 2);
          }
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            step,
            agent: 'Model',
            message: errorMessage,
            details: errorDetails,
            requestId: requestId,
            text: `Error: ${errorMessage}${errorDetails ? '\n\nDetails:\n' + errorDetails : ''}`,
          })}\n\n`));

          finalMessage = `Error: ${errorMessage}. Request ID: ${requestId}`;

        }finally{

          const endPayload = {
            type: 'end',
            finalMessage,
            images: imageUrls,
            requestId: sessionId
          };
          log('Streaming final message and closing connection', endPayload);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(endPayload)}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked'
      }
    });
  } catch (err) {
    log('Error during processing', err);
    
    // Extract meaningful error information
    let errorMessage = 'Internal Server Error';
    let errorDetails = '';
    
    if (err instanceof Error) {
      errorMessage = err.message || errorMessage;
      errorDetails = err.stack || '';
    } else if (typeof err === 'string') {
      errorMessage = err;
    } else if (err && typeof err === 'object') {
      errorMessage = err.message || err.toString() || errorMessage;
      errorDetails = JSON.stringify(err, null, 2);
    }
    
    // Return a proper error response with details
    return new Response(JSON.stringify({
      error: errorMessage,
      details: errorDetails,
      requestId: sessionId,
      timestamp: new Date().toISOString()
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}


