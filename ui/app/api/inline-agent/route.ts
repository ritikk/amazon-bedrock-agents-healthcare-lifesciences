// app/api/inline-agent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { InlineAgentService } from '../../../lib/inline-agent-service';

const LAMBDA_FUNCTION_ARN = 'arn:aws:lambda:us-east-1:929445170179:function:pr-sentiment-tavily-search-processor';

export async function POST(req: NextRequest) {
  try {
    const { drug_name, max_results = 20, session_id } = await req.json();

    // Validate input
    if (!drug_name || typeof drug_name !== 'string') {
      return NextResponse.json(
        { error: 'Drug name is required and must be a string' },
        { status: 400 }
      );
    }

    // Initialize InlineAgent service
    const agentService = new InlineAgentService(process.env.AWS_REGION || 'us-east-1');

    // Validate drug name
    const validation = agentService.validateDrugName(drug_name);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Create agent configuration
    const config = agentService.createPRSentimentAgentConfig(
      drug_name.trim(),
      Math.min(Math.max(max_results, 1), 100), // Limit between 1-100
      LAMBDA_FUNCTION_ARN
    );

    // Use provided session ID or generate new one
    if (session_id) {
      config.sessionId = session_id;
    }

    // Invoke InlineAgent
    const response = await agentService.invokeAgent(config);

    // Process streaming response
    const result = await agentService.processStreamingResponse(response);

    return NextResponse.json({
      success: true,
      session_id: config.sessionId,
      drug_name: drug_name.trim(),
      max_results,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('InlineAgent API error:', error);
    
    let errorMessage = 'Internal server error';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific AWS errors
      if (error.message.includes('AccessDenied')) {
        errorMessage = 'Access denied. Please check AWS permissions.';
        statusCode = 403;
      } else if (error.message.includes('ValidationException')) {
        errorMessage = 'Invalid request parameters.';
        statusCode = 400;
      } else if (error.message.includes('ThrottlingException')) {
        errorMessage = 'Request rate limit exceeded. Please try again later.';
        statusCode = 429;
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'PR Sentiment Intelligence InlineAgent API',
    endpoints: {
      POST: '/api/inline-agent - Invoke InlineAgent for drug sentiment analysis'
    },
    parameters: {
      drug_name: 'string (required) - Name of the drug to analyze',
      max_results: 'number (optional, 1-100) - Maximum number of reviews to collect',
      session_id: 'string (optional) - Session ID for conversation continuity'
    },
    example: {
      drug_name: 'Lipitor',
      max_results: 20
    }
  });
}
