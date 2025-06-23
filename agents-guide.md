# 🎯 Complete Guide to Amazon Bedrock InlineAgents

## 📋 What are InlineAgents?

**InlineAgents** are Amazon Bedrock agents that you can configure and invoke **dynamically at runtime** using the `InvokeInlineAgent` API. Unlike traditional agents that must be pre-configured, InlineAgents provide complete flexibility to specify agent capabilities (models, instructions, action groups, guardrails, knowledge bases) at invocation time.

## 🔑 Key Benefits

1. **Dynamic Configuration**: No need to pre-define agents
2. **Rapid Experimentation**: Try different configurations instantly
3. **Multi-Agent Collaboration**: Create supervisor-collaborator hierarchies
4. **Runtime Flexibility**: Change models, tools, and instructions per request
5. **Cost Efficiency**: No persistent agent resources

## 🏗️ Core Architecture

### Required Components
- **Foundation Model**: Any Bedrock-supported model (Claude, Llama, etc.)
- **Instructions**: Natural language description of agent behavior (min 40 chars)
- **Session ID**: Unique identifier for conversation continuity

### Optional Components
- **Action Groups**: Custom functions and tools
- **Knowledge Bases**: RAG capabilities
- **Guardrails**: Safety and content filtering
- **Advanced Prompts**: Custom prompt templates
- **Multi-Agent Setup**: Supervisor-collaborator patterns

## 🛠️ Prerequisites

### 1. IAM Permissions
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "bedrock:InvokeInlineAgent"
        },
        {
            "Effect": "Allow",
            "Action": "bedrock:InvokeModel",
            "Resource": "arn:aws:bedrock:${region}::foundation-model/{modelId}"
        },
        {
            "Effect": "Allow",
            "Action": ["bedrock:Retrieve", "bedrock:RetrieveAndGenerate"],
            "Resource": "arn:aws:bedrock:${region}:${account-id}:knowledge-base/*"
        },
        {
            "Effect": "Allow",
            "Action": "lambda:InvokeFunction",
            "Resource": "arn:aws:lambda:${region}:${account-id}:function:*"
        },
        {
            "Effect": "Allow",
            "Action": "bedrock:ApplyGuardrail",
            "Resource": "arn:aws:bedrock:${region}:${account-id}:guardrail/*"
        },
        {
            "Effect": "Allow",
            "Action": ["kms:GenerateDataKey*", "kms:Decrypt"],
            "Resource": "arn:aws:kms:${region}:${account-id}:key/*"
        }
    ]
}
```

### 2. Model Access
- Request access to foundation models in Bedrock console
- Supported models: Claude, Llama, Nova, etc.
- Can switch between models in same family

### 3. Regional Support
- Available in all regions where Bedrock Agents are supported
- Check [Supported Regions documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-supported.html)

## 🚀 Basic Implementation

### Minimal InlineAgent
```python
import boto3

bedrock_agent_runtime = boto3.client('bedrock-agent-runtime')

response = bedrock_agent_runtime.invoke_inline_agent(
    sessionId='unique-session-id',
    foundationModel='anthropic.claude-3-5-haiku-20241022-v1:0',
    instruction='You are a helpful assistant that answers questions clearly and concisely.',
    inputText='Hello, can you help me with a task?',
    enableTrace=True
)
```

### Advanced InlineAgent with All Features
```python
import json
import boto3

bedrock_agent_runtime = boto3.client('bedrock-agent-runtime')

response = bedrock_agent_runtime.invoke_inline_agent(
    # Required fields
    sessionId='advanced-session-id',
    foundationModel='anthropic.claude-3-5-haiku-20241022-v1:0',
    instruction='You are a healthcare assistant with access to medical databases and code interpretation.',
    inputText='Analyze this patient data and create a visualization',
    
    # Action Groups
    actionGroups=[
        {
            'actionGroupName': 'CodeInterpreter',
            'parentActionGroupSignature': 'AMAZON.CodeInterpreter'
        },
        {
            'actionGroupName': 'MedicalDatabase',
            'actionGroupExecutor': {
                'lambda': 'arn:aws:lambda:${region}:${account-id}:function:medical-db-function'
            },
            'apiSchema': {
                'payload': json.dumps({
                    "openapi": "3.0.0",
                    "info": {"title": "Medical API", "version": "1.0.0"},
                    "paths": {
                        "/search-patient": {
                            "post": {
                                "description": "Search patient records",
                                "parameters": [
                                    {"name": "patient_id", "type": "string", "required": True}
                                ]
                            }
                        }
                    }
                })
            }
        }
    ],
    
    # Knowledge Bases
    knowledgeBases=[
        {
            'knowledgeBaseId': 'KB123456789',
            'description': 'Medical literature and guidelines',
            'retrievalConfiguration': {
                'vectorSearchConfiguration': {
                    'numberOfResults': 5,
                    'overrideSearchType': 'HYBRID'
                }
            }
        }
    ],
    
    # Guardrails
    guardrailConfiguration={
        'guardrailIdentifier': 'medical-safety-guardrail',
        'guardrailVersion': '1.0'
    },
    
    # Advanced Configuration
    enableTrace=True,
    idleSessionTTLInSeconds=3600,
    customerEncryptionKeyArn='arn:aws:kms:${region}:${account-id}:key/${key-id}',
    
    # Session State
    inlineSessionState={
        'sessionAttributes': {
            'user_role': 'doctor',
            'department': 'cardiology'
        },
        'promptSessionAttributes': {
            'context': 'patient_consultation'
        }
    }
)
```

## 🤝 Multi-Agent Collaboration

### Supervisor-Collaborator Pattern
```python
# Supervisor Agent
supervisor_response = bedrock_agent_runtime.invoke_inline_agent(
    sessionId='multi-agent-session',
    foundationModel='anthropic.claude-3-5-haiku-20241022-v1:0',
    instruction='You are a supervisor agent that coordinates between specialist agents.',
    agentCollaboration='SUPERVISOR',
    
    # Define collaborators
    collaborators=[
        {
            'agentName': 'DataAnalyst',
            'foundationModel': 'anthropic.claude-3-5-haiku-20241022-v1:0',
            'instruction': 'You are a data analysis specialist.',
            'actionGroups': [
                {
                    'actionGroupName': 'CodeInterpreter',
                    'parentActionGroupSignature': 'AMAZON.CodeInterpreter'
                }
            ]
        },
        {
            'agentName': 'Researcher',
            'foundationModel': 'anthropic.claude-3-5-haiku-20241022-v1:0',
            'instruction': 'You are a research specialist.',
            'knowledgeBases': [
                {
                    'knowledgeBaseId': 'research-kb-123',
                    'description': 'Research papers and publications'
                }
            ]
        }
    ],
    
    inputText='Analyze the latest cancer research and create a summary report with visualizations'
)
```

### Supported Multi-Agent Combinations
| Supervisor | Collaborator |
|------------|--------------|
| Inline     | Inline       |
| Inline     | Traditional  |

## 🎨 Advanced Prompt Templates

### Custom Orchestration Prompt
```python
response = bedrock_agent_runtime.invoke_inline_agent(
    sessionId='custom-prompt-session',
    foundationModel='anthropic.claude-3-5-haiku-20241022-v1:0',
    instruction='You are a specialized medical assistant.',
    
    promptOverrideConfiguration={
        'promptConfigurations': [
            {
                'promptType': 'ORCHESTRATION',
                'promptCreationMode': 'OVERRIDDEN',
                'promptState': 'ENABLED',
                'basePromptTemplate': '''
You are a medical AI assistant with the following capabilities:
- Access to medical databases
- Code interpretation for data analysis
- Knowledge of medical literature

Instructions: $instructions$

Available Tools: $tools$

User Input: $input$

Think step by step and provide accurate medical information.
''',
                'inferenceConfiguration': {
                    'temperature': 0.1,
                    'topP': 0.9,
                    'maximumLength': 2048
                },
                'additionalModelRequestFields': {
                    'reasoning_config': {
                        'type': 'enabled',
                        'budget_tokens': 1024
                    }
                }
            }
        ]
    },
    
    inputText='What are the latest treatments for Type 2 diabetes?'
)
```

### Available Prompt Types
- **PRE_PROCESSING**: Input validation and preprocessing
- **ORCHESTRATION**: Main agent reasoning and tool selection
- **KNOWLEDGE_BASE_RESPONSE_GENERATION**: RAG response formatting
- **POST_PROCESSING**: Output formatting and validation
- **MEMORY_SUMMARIZATION**: Conversation history summarization
- **ROUTING_CLASSIFIER**: Multi-agent routing decisions

## 📊 Code Interpreter Integration

### Data Analysis with Code Interpreter
```python
response = bedrock_agent_runtime.invoke_inline_agent(
    sessionId='code-analysis-session',
    foundationModel='anthropic.claude-3-5-haiku-20241022-v1:0',
    instruction='You are a data scientist that can analyze data and create visualizations.',
    
    actionGroups=[
        {
            'actionGroupName': 'CodeInterpreter',
            'parentActionGroupSignature': 'AMAZON.CodeInterpreter'
        }
    ],
    
    # Upload data files
    inlineSessionState={
        'files': [
            {
                'name': 'patient_data.csv',
                'source': {
                    'sourceType': 'S3',
                    's3Location': {
                        'uri': 's3://my-bucket/patient_data.csv'
                    }
                },
                'useCase': 'CODE_INTERPRETER'
            }
        ]
    },
    
    inputText='Analyze the patient data CSV file and create a visualization showing age distribution'
)
```

### Code Interpreter Capabilities
- **Python Code Execution**: Run Python scripts in secure environment
- **Data Analysis**: Pandas, NumPy, SciPy libraries available
- **Visualization**: Matplotlib, Seaborn for charts and graphs
- **File Processing**: Handle CSV, JSON, Excel files
- **Mathematical Computing**: Statistical analysis and modeling

## 🔒 Security Best Practices

### 1. Encryption
```python
# Use customer-managed KMS keys
customerEncryptionKeyArn='arn:aws:kms:${region}:${account-id}:key/${key-id}'
```

### 2. Guardrails
```python
guardrailConfiguration={
    'guardrailIdentifier': 'healthcare-safety-guardrail',
    'guardrailVersion': 'DRAFT'  # or specific version
}
```

### 3. Session Management
```python
# Set appropriate session timeout
idleSessionTTLInSeconds=1800  # 30 minutes

# End sessions when done
endSession=True
```

### 4. Access Control
- Use least-privilege IAM policies
- Restrict Lambda function access
- Limit knowledge base permissions
- Monitor API usage with CloudTrail

## 📈 Response Handling

### Streaming Response Processing
```python
def process_inline_agent_response(response):
    """Process streaming response from InlineAgent"""
    for event in response['completion']:
        if 'chunk' in event:
            chunk = event['chunk']
            if 'bytes' in chunk:
                # Process text response
                text = chunk['bytes'].decode('utf-8')
                print(f"Response: {text}")
                
        elif 'trace' in event:
            # Process trace information
            trace = event['trace']
            print(f"Trace: {trace}")
            
        elif 'files' in event:
            # Process generated files
            files = event['files']
            for file in files['files']:
                print(f"Generated file: {file['name']}")
                # Save file content
                with open(file['name'], 'wb') as f:
                    f.write(file['bytes'])
                
        elif 'returnControl' in event:
            # Handle return control
            control = event['returnControl']
            print(f"Return control: {control}")
            # Process invocation inputs for custom handling
```

### Error Handling
```python
try:
    response = bedrock_agent_runtime.invoke_inline_agent(**params)
    process_inline_agent_response(response)
except ClientError as e:
    error_code = e.response['Error']['Code']
    if error_code == 'AccessDeniedException':
        print("Check IAM permissions")
    elif error_code == 'ValidationException':
        print("Check input parameters")
    elif error_code == 'ThrottlingException':
        print("Rate limit exceeded, retry with backoff")
    elif error_code == 'ServiceQuotaExceededException':
        print("Service quota exceeded")
    else:
        print(f"Unexpected error: {e}")
```

## 🎯 Use Cases & Examples

### 1. Healthcare Assistant
```python
healthcare_agent = {
    'foundationModel': 'anthropic.claude-3-5-haiku-20241022-v1:0',
    'instruction': '''You are a healthcare AI assistant that helps with:
    - Medical literature search and analysis
    - Patient data interpretation
    - Treatment recommendation research
    - Drug interaction checking
    Always provide evidence-based information and recommend consulting healthcare professionals.''',
    'actionGroups': [
        {'actionGroupName': 'CodeInterpreter', 'parentActionGroupSignature': 'AMAZON.CodeInterpreter'}
    ],
    'knowledgeBases': [
        {'knowledgeBaseId': 'medical-literature-kb', 'description': 'Medical journals and guidelines'}
    ],
    'guardrailConfiguration': {
        'guardrailIdentifier': 'medical-safety-guardrail',
        'guardrailVersion': '1.0'
    }
}
```

### 2. Financial Analyst
```python
financial_agent = {
    'foundationModel': 'anthropic.claude-3-5-haiku-20241022-v1:0',
    'instruction': '''You are a financial analyst AI that provides:
    - Market data analysis and trends
    - Risk assessment and portfolio optimization
    - Regulatory compliance guidance
    - Financial modeling and forecasting''',
    'actionGroups': [
        {'actionGroupName': 'CodeInterpreter', 'parentActionGroupSignature': 'AMAZON.CodeInterpreter'},
        {'actionGroupName': 'MarketData', 'actionGroupExecutor': {'lambda': 'market-data-function'}}
    ],
    'knowledgeBases': [
        {'knowledgeBaseId': 'financial-regulations-kb', 'description': 'Financial regulations and compliance'}
    ]
}
```

### 3. Research Assistant
```python
research_agent = {
    'foundationModel': 'anthropic.claude-3-5-haiku-20241022-v1:0',
    'instruction': '''You are a research assistant that helps with:
    - Literature review and synthesis
    - Data analysis and visualization
    - Statistical analysis and interpretation
    - Research report generation''',
    'actionGroups': [
        {'actionGroupName': 'CodeInterpreter', 'parentActionGroupSignature': 'AMAZON.CodeInterpreter'}
    ],
    'knowledgeBases': [
        {'knowledgeBaseId': 'academic-papers-kb', 'description': 'Academic papers and research'}
    ]
}
```

### 4. Customer Service Multi-Agent
```python
customer_service_supervisor = {
    'foundationModel': 'anthropic.claude-3-5-haiku-20241022-v1:0',
    'instruction': 'You coordinate customer service requests between specialized agents.',
    'agentCollaboration': 'SUPERVISOR',
    'collaborators': [
        {
            'agentName': 'TechnicalSupport',
            'instruction': 'Handle technical issues and troubleshooting',
            'actionGroups': [{'actionGroupName': 'TechTools', 'actionGroupExecutor': {'lambda': 'tech-support-function'}}]
        },
        {
            'agentName': 'BillingSupport',
            'instruction': 'Handle billing and account questions',
            'actionGroups': [{'actionGroupName': 'BillingTools', 'actionGroupExecutor': {'lambda': 'billing-function'}}]
        }
    ]
}
```

## ⚡ Performance Optimization

### 1. Model Selection
```python
# Use inference profiles for cost optimization
foundationModel='us.anthropic.claude-3-5-haiku-20241022-v1:0'  # Inference profile

# Configure performance settings
bedrockModelConfigurations={
    'performanceConfig': {
        'latency': 'optimized'  # or 'standard'
    }
}
```

### 2. Session Management
```python
# Reuse sessions for related conversations
session_id = f"user-{user_id}-{datetime.now().strftime('%Y%m%d')}"

# Set appropriate TTL values
idleSessionTTLInSeconds=3600  # 1 hour for active users

# Clean up unused sessions
if conversation_ended:
    response = bedrock_agent_runtime.invoke_inline_agent(
        sessionId=session_id,
        endSession=True,
        # ... other parameters
    )
```

### 3. Prompt Engineering
```python
# Use clear, specific instructions
instruction = '''You are a specialized medical AI assistant.

Your capabilities:
- Analyze medical data using Python code
- Search medical literature
- Provide evidence-based recommendations

Your limitations:
- Cannot provide direct medical advice
- Always recommend consulting healthcare professionals
- Focus on research and analysis support

Response format:
1. Analysis summary
2. Key findings
3. Recommendations for further consultation'''

# Implement few-shot examples in session state
inlineSessionState={
    'promptSessionAttributes': {
        'example_1': 'Previous successful interaction example',
        'example_2': 'Another example of desired behavior'
    }
}
```

### 4. Streaming Configuration
```python
streamingConfigurations={
    'applyGuardrailInterval': 5,  # Apply guardrails every 5 chunks
    'streamFinalResponse': True   # Stream the final response
}
```

## 🚨 Limitations & Considerations

### Current Limitations
1. **Preview Feature**: Currently in preview, subject to change
2. **Console Support**: Not available in Bedrock console
3. **CLI Support**: AWS CLI doesn't support streaming operations
4. **Model Switching**: Best practice is to stay within same model family

### Best Practices
1. **Session Isolation**: Sessions are account-level, use unique agent names for isolation
2. **Consistent Encryption**: Use same KMS key throughout session
3. **Prompt Consistency**: Use custom prompt templates for consistent behavior
4. **Cost Management**: Monitor token usage and session duration

### Scaling Considerations
```python
# Implement connection pooling
import boto3
from botocore.config import Config

config = Config(
    retries={'max_attempts': 3},
    max_pool_connections=50
)

bedrock_agent_runtime = boto3.client(
    'bedrock-agent-runtime',
    config=config
)

# Implement rate limiting
import time
from functools import wraps

def rate_limit(calls_per_second=10):
    def decorator(func):
        last_called = [0.0]
        @wraps(func)
        def wrapper(*args, **kwargs):
            elapsed = time.time() - last_called[0]
            left_to_wait = 1.0 / calls_per_second - elapsed
            if left_to_wait > 0:
                time.sleep(left_to_wait)
            ret = func(*args, **kwargs)
            last_called[0] = time.time()
            return ret
        return wrapper
    return decorator

@rate_limit(calls_per_second=5)
def invoke_inline_agent_with_rate_limit(**kwargs):
    return bedrock_agent_runtime.invoke_inline_agent(**kwargs)
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Access Denied Errors
```python
# Check IAM permissions
# Ensure role has bedrock:InvokeInlineAgent permission
# Verify model access in the region
# Check knowledge base and Lambda permissions
```

#### 2. Model Not Available
```python
# Verify model access in Bedrock console
# Check if model is supported in your region
# Ensure model ID format is correct
```

#### 3. Session Timeout Issues
```python
# Adjust TTL settings
idleSessionTTLInSeconds=7200  # 2 hours

# Implement session refresh logic
def refresh_session_if_needed(session_id, last_activity):
    if time.time() - last_activity > 1800:  # 30 minutes
        # Start new session or extend current one
        pass
```

#### 4. Guardrail Blocking Content
```python
# Review guardrail configuration
# Check guardrail logs in CloudWatch
# Adjust guardrail sensitivity if needed
# Implement content preprocessing
```

#### 5. Lambda Function Timeouts
```python
# Optimize Lambda function performance
# Increase timeout settings
# Implement async processing for long-running tasks
# Use Step Functions for complex workflows
```

### Debugging with Traces
```python
# Enable detailed tracing
response = bedrock_agent_runtime.invoke_inline_agent(
    enableTrace=True,
    # ... other parameters
)

# Process trace events for debugging
for event in response['completion']:
    if 'trace' in event:
        trace = event['trace']
        print(f"Trace Event: {trace['trace']}")
        print(f"Session ID: {trace['sessionId']}")
        print(f"Event Time: {trace['eventTime']}")
```

## 📚 Additional Resources

### AWS Documentation
- [InvokeInlineAgent API Reference](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeInlineAgent.html)
- [Multi-Agent Collaboration Guide](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-multi-agent-collaboration.html)
- [Advanced Prompts Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/advanced-prompts.html)
- [Code Interpreter Guide](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-enable-code-interpretation.html)

### Code Examples
- [AWS SDK Examples Repository](https://github.com/awsdocs/aws-doc-sdk-examples)
- [Bedrock Agents Code Samples](https://docs.aws.amazon.com/bedrock/latest/userguide/service_code_examples_bedrock-agent.html)

### Best Practices
- [Prompt Engineering Guidelines](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-engineering-guidelines.html)
- [Security Best Practices](https://docs.aws.amazon.com/bedrock/latest/userguide/security-best-practices.html)
- [Cost Optimization Guide](https://docs.aws.amazon.com/bedrock/latest/userguide/cost-optimization.html)

---

## 🎉 Conclusion

Amazon Bedrock InlineAgents provide unprecedented flexibility for building AI applications. Start with simple use cases and gradually add complexity as you become more familiar with the capabilities. The key to success is:

1. **Start Simple**: Begin with basic agent configurations
2. **Iterate Quickly**: Use the dynamic nature to experiment
3. **Monitor Performance**: Track costs, latency, and accuracy
4. **Implement Security**: Use guardrails, encryption, and proper IAM
5. **Scale Thoughtfully**: Plan for growth and optimize accordingly

With InlineAgents, you can build sophisticated AI applications that adapt to your needs in real-time, providing powerful capabilities while maintaining flexibility and control.
