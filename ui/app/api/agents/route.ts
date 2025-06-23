import { NextResponse } from 'next/server';
import { BedrockAgentClient, ListAgentsCommand, GetAgentCommand, ListTagsForResourceCommand, ListAgentCollaboratorsCommand, ListAgentVersionsCommand } from "@aws-sdk/client-bedrock-agent";
//import { fromEnv } from "@aws-sdk/credential-providers";

import dotenv from "dotenv";
dotenv.config();

const REGION: string = process.env.AWS_REGION


const client = new BedrockAgentClient({ 
  region: REGION
  //credentials: fromEnv()
 });

async function getLatestAgentVersionByUpdatedTimeStamp(agentId: string) {
    try {
      const command = new ListAgentVersionsCommand({agentId: agentId, maxResults: 10 });
      const response = await client.send(command);
      console.log("Fetched Agent Versions:", response.agentVersionSummaries);
      if (response.agentVersionSummaries && response.agentVersionSummaries.length > 0) {
        // Sort the agent versions by creation date in descending order
        const sortedVersions = response.agentVersionSummaries.sort((a, b) => {
          if (a.updatedAt && b.updatedAt) {
            return b.updatedAt.getTime() - a.updatedAt.getTime();
          }
          return 0;
        });
        // Return the latest agent version
        return sortedVersions[0].agentVersion;
      }
      else {
        console.log("No agent versions found for agentId:", agentId);
        return null
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
      return null;
    }
}

async function listAgents() {
  try {
    const command = new ListAgentsCommand({ maxResults: 100 });
    const response = await client.send(command);
    console.log("Fetched Agents:", response.agentSummaries);
    console.log("Fetched Agents count:", response.agentSummaries?.length);
    return response.agentSummaries || [];
  } catch (error) {
    console.error("Error fetching agents:", error);
    return [];
  }
}

async function getAgentTags(agentArn: string) {
    try {
      const command = new ListTagsForResourceCommand({ resourceArn: agentArn });
      const response = await client.send(command);
      return response.tags ? Object.entries(response.tags).map(([key, value]) => `${key}: ${value}`) : [];
    } catch (error) {
      console.error(`Error fetching tags for agent ARN ${agentArn}:`, error);
      return [];
    }
}

async function getAgentDetails(agentId: string) {
    try {
        const command = new GetAgentCommand({ agentId });
        const response = await client.send(command);
        // Add null check for response.agent
        if (!response.agent || !response.agent.agentArn) {
          console.error('No agent data received for ', agentId);
          return null;
        }
        // Only get collaborator details if agent has collaboration enabled
        const collaborators = ['SUPERVISOR', 'SUPERVISOR_ROUTER'].includes(response.agent.agentCollaboration)
            ? await getAgentCollaboratorDetails(response.agent.agentId)
            : null;

      console.log("Collaborators:", collaborators);

      return {
        id: response.agent.agentId,
        name: response.agent.agentName,
        description: response.agent.description || "No description available.",
        version: response.agent.agentVersion,
        foundationModel: response.agent.foundationModel || "N/A",
        orchestrationType: response.agent.orchestrationType || "Default",
        createdAt: response.agent.createdAt ? response.agent.createdAt.toISOString() : "N/A",
        updatedAt: response.agent.updatedAt ? response.agent.updatedAt.toISOString() : "N/A",
        tags: response.agent.agentArn ? await getAgentTags(response.agent.agentArn) : [],
        image: "/images/default_agent_icon.png",
        category: "HCLS",
        agentCollaboration: response.agent.agentCollaboration || "N/A",
        agentResourceRoleArn: response.agent.agentResourceRoleArn || "N/A",
        agentStatus: response.agent.agentStatus,
        instruction: response.agent.instruction || "N/A",
        promptOverrideConfiguration: response.agent.promptOverrideConfiguration || {},
        collaborators: collaborators?.agentCollaboratorNames ?? null
      };
    } catch (error) {
      console.error(`Error fetching details for agent ${agentId}:`, error);
      return null;
    }
}

async function getAgentCollaboratorDetails(agentId: string) {

  //Get the latest agent version by updated timestamp
  const latestAgentVersion = await getLatestAgentVersionByUpdatedTimeStamp(agentId);
  if (!latestAgentVersion) {
    console.error('No agent version data received');
    return null;
  }

  try {
    const command = new ListAgentCollaboratorsCommand({ agentId: agentId, agentVersion: latestAgentVersion });
    const response = await client.send(command);
    // Add null check for response.agent
    if (!response.agentCollaboratorSummaries || response.agentCollaboratorSummaries.length == 0) {
      console.error('No agent data received');
      return null;
    }
    return {
      //get names from agentCollaboratorSummaries
      agentCollaboratorNames: response.agentCollaboratorSummaries.map((agent) => agent.collaboratorName)
    };
    } catch (error) {
      console.error(`Error fetching details for agent ${agentId}:`, error);
      return null;
    }
  }

export async function GET() {
    try {
      const agents = await listAgents();
      const detailedAgents = await Promise.all(
       agents.map(async (agent) => {
          if (!agent.agentId) {
            return null; // or return a default structure
          }
          return getAgentDetails(agent.agentId)}));
   //     }).filter((result): result is NonNullable<typeof result> => result !== null)
      //);

      const validAgents = detailedAgents.filter(agent => agent !== null);

      // Add PR Sentiment Intelligence InlineAgent
      const prSentimentAgent = {
        id: 'pr-sentiment-intelligence-inline',
        name: 'PR Sentiment Intelligence Agent',
        description: 'AI-powered pharmaceutical sentiment analysis agent that collects and analyzes patient reviews from Drugs.com using InlineAgent technology. Provides multi-dimensional sentiment analysis, risk detection, and patient experience insights.',
        version: '1.0',
        foundationModel: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
        orchestrationType: 'InlineAgent',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['InlineAgent', 'Pharmaceutical', 'Sentiment Analysis', 'Healthcare', 'PR Intelligence'],
        image: '/images/default_agent_icon.png',
        category: 'InlineAgent',
        agentCollaboration: 'INLINE_AGENT',
        agentResourceRoleArn: 'N/A',
        agentStatus: 'ACTIVE',
        instruction: 'Pharmaceutical data collection specialist for sentiment analysis of patient reviews',
        promptOverrideConfiguration: {},
        collaborators: null,
        isInlineAgent: true,
        capabilities: [
          'Drug review collection from Drugs.com',
          'Multi-dimensional sentiment analysis',
          'Risk detection and safety signals',
          'Patient experience insights',
          'Compliance with healthcare guidelines'
        ]
      };

      validAgents.push(prSentimentAgent);

      return NextResponse.json(validAgents);
    } catch (error) {
      console.error("Error fetching Bedrock agents:", error);
      return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
    }
}
