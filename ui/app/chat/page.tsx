"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  sender: string;
  text: string;
  timestamp: string;
  trace?: string;
}

interface Agent {
  name: string;
  image?: string;
  icon?: string;
  agentCollaboration: 'SUPERVISOR' | 'DISABLED';
  collaborators?: string[];
}

export default function ChatPage() {
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [instruction, setInstruction] = useState('You are a medical research assistant AI specializing in cancer biomarker analysis and discovery. Coordinate sub-agents to fulfill user questions.');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRequestIdRef = useRef(`req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
  const isSupervisorChat = selectedAgents.some(agent => 
    agent.agentCollaboration === 'SUPERVISOR' || agent.agentCollaboration === 'SUPERVISOR_ROUTER'
  );
  const [alwaysCollapseTraces, setAlwaysCollapseTraces] = useState(false);

  // Check if this is a PR Sentiment Intelligence InlineAgent request
  const isPRSentimentAgent = selectedAgents.some(agent => agent.isInlineAgent);

  // Component for displaying sentiment analysis results
  const SentimentAnalysisResults = ({ data }) => {
    if (!data || !data.total_reviews) return null;
    
    return (
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200 mt-2">
        <h4 className="font-semibold text-green-800 mb-2">📊 Sentiment Analysis Results</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Total Reviews:</span> {data.total_reviews}
          </div>
          <div>
            <span className="font-medium">Source:</span> Drugs.com
          </div>
          {data.search_metadata && (
            <div className="col-span-2">
              <span className="font-medium">Search Query:</span> {data.search_metadata.search_query || 'N/A'}
            </div>
          )}
        </div>
        {data.reviews && data.reviews.length > 0 && (
          <div className="mt-3">
            <span className="font-medium text-sm">Sample Reviews:</span>
            <div className="max-h-32 overflow-y-auto mt-1">
              {data.reviews.slice(0, 3).map((review, idx) => (
                <div key={idx} className="text-xs bg-white p-2 rounded border mb-1">
                  {review.content?.substring(0, 100)}...
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Component for displaying formatted sentiment analysis report
  const SentimentAnalysisReport = ({ text }) => {
    if (!text || typeof text !== 'string') return null;

    // Check if this looks like a sentiment analysis report
    const isSentimentReport = text.includes('Sentiment Analysis Report') || 
                             text.includes('Multi-Dimensional Sentiment Analysis') ||
                             text.includes('Overall Patient Sentiment') ||
                             text.includes('Drug Efficacy Perception') ||
                             text.includes('Data Collection Summary');

    if (!isSentimentReport) {
      // If not a sentiment report, render as regular markdown
      return (
        <div className="mt-2 max-w-none">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({children}) => <h1 className="text-2xl font-bold text-gray-900 mb-4">{children}</h1>,
              h2: ({children}) => <h2 className="text-xl font-semibold text-gray-800 mb-3">{children}</h2>,
              h3: ({children}) => <h3 className="text-lg font-medium text-gray-700 mb-2">{children}</h3>,
              p: ({children}) => <p className="text-gray-700 mb-2 leading-relaxed">{children}</p>,
              ul: ({children}) => <ul className="list-none space-y-1 mb-3">{children}</ul>,
              li: ({children}) => (
                <li className="flex items-start gap-2 text-gray-700">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{children}</span>
                </li>
              ),
              strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
      );
    }

    // For sentiment reports, use enhanced styling
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200 mt-4">
        <div className="max-w-none">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({children}) => (
                <h1 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-2">
                  {children}
                </h1>
              ),
              h2: ({children}) => (
                <h2 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-2">
                  {children}
                </h2>
              ),
              h3: ({children}) => (
                <h3 className="text-lg font-semibold text-gray-800 mb-4 mt-6 border-b border-gray-300 pb-2">
                  {children}
                </h3>
              ),
              p: ({children}) => {
                // Check if this paragraph contains sentiment classification
                const childText = children?.toString() || '';
                if (childText.includes('Sentiment:') || childText.includes('Perception:') || 
                    childText.includes('Tolerance:') || childText.includes('Experience:') || 
                    childText.includes('Likelihood:')) {
                  return (
                    <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 shadow-sm mb-3">
                      <p className="font-semibold text-blue-800 mb-1">{children}</p>
                    </div>
                  );
                }
                return <p className="text-gray-700 mb-3 leading-relaxed">{children}</p>;
              },
              ul: ({children}) => <ul className="list-none space-y-2 mb-4">{children}</ul>,
              li: ({children}) => (
                <li className="flex items-start gap-2 text-gray-700">
                  <span className="text-blue-500 mt-1 flex-shrink-0">•</span>
                  <span className="flex-1">{children}</span>
                </li>
              ),
              strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
              // Handle code blocks if any
              code: ({children}) => (
                <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{children}</code>
              ),
              pre: ({children}) => (
                <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto text-sm">{children}</pre>
              )
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
      </div>
    );
  };

  const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const sendMessage = async () => {
    if (!input.trim()) return;
    const timestamp = new Date().toISOString();
    const userMessage = { sender: 'You', text: input, timestamp };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    // Check if we're using InlineAgent
    const isInlineAgent = selectedAgents.some(agent => agent.isInlineAgent);
    const inlineAgentType = isInlineAgent ? 'pr-sentiment' : null;

    // Insert placeholder trace message immediately
    const chat_request_id = chatRequestIdRef.current;
    setMessages((prev) => [
      ...prev,
      {
        sender: 'AI Agent',
        text: '',
        trace: [{ type: 'placeholder', text: 'Trace loading for chat id : ' + chat_request_id }],
        expandTrace: true
      }
    ]);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input, 
          agents: selectedAgents, 
          agent_instruction: instruction,
          requestId : chat_request_id,
          inline_agent_type: inlineAgentType
        })
      });

      // Handle non-streaming error responses
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          
          // Add error message to chat
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.sender === 'AI Agent') {
              lastMsg.text = `Error: ${errorMessage}`;
              lastMsg.trace = [{
                type: 'error',
                step: 1,
                agent: 'System',
                message: errorMessage,
                details: errorData.details || '',
                requestId: errorData.requestId || chat_request_id,
                text: `Error: ${errorMessage}${errorData.details ? '\n\nDetails:\n' + errorData.details : ''}`
              }];
              lastMsg.expandTrace = true;
              lastMsg.timestamp = new Date().toISOString();
            }
            return updated;
          });
          setIsProcessing(false);
          return;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
      }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let finalText = '';
    let stepCount = 0;

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const fullChunk = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 2);

        if (fullChunk.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(fullChunk.slice(6));
  
            if (parsed.type === 'chunk') {
              finalText += parsed.data;
              setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                if (!lastMsg || lastMsg.sender !== 'AI Agent') {
                  return [...prev, { sender: 'AI Agent', text: parsed.data, trace: [{ type: 'placeholder', text: 'Trace loading...' }], expandTrace: true }];
                }
                const updated = [...prev];
                updated[updated.length - 1].text += parsed.data;
                return updated;
              });
            }
  
            else if (['rationale', 'tool', 'observation', 'agent-collaborator', 'knowledge-base', 'error'].includes(parsed.type)) {
              const step = parsed.step !== undefined ? parsed.step : stepCount + 1;
              stepCount = step;
              const agent = parsed.agent || parsed.data?.agent || 'unknown-agent';
              const traceStep = { ...parsed, step, agent };
              setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (!lastMsg || lastMsg.sender !== 'AI Agent') {
                updated.push({ sender: 'AI Agent', text: '', trace: [traceStep], expandTrace: true });
              } else {
                const existing = lastMsg.trace || [];
                const alreadyExists = existing.some(t =>
                  t.step === traceStep.step &&
                  t.type === traceStep.type &&
                  t.text === traceStep.text
                );
                if (!alreadyExists) {
                  lastMsg.trace = [...existing.filter(t => t.type !== 'placeholder'), traceStep];
  lastMsg.trace.push(existing.find(t => t.type === 'placeholder'));
                  }
                  lastMsg.expandTrace = true;
                }
                return updated;
              });
            }
            else if (parsed.type === 'end') {
              setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.sender === 'AI Agent') {
                lastMsg.text = parsed.finalMessage || finalText;
                lastMsg.timestamp = new Date().toISOString();
                lastMsg.images = parsed.images || (parsed.image ? [parsed.image] : []);
                lastMsg.trace = (lastMsg.trace || []).filter(t => t.type !== 'placeholder');
                  lastMsg.expandTrace = true;
                }
                return updated;
              });
              setIsProcessing(false);
            }
  
          } catch (e) {
            console.error('Error parsing SSE:', e);
            console.error(fullChunk);
          }
        }
        
        boundary = buffer.indexOf('\n\n');

      }  
    }
    } catch (fetchError) {
      console.error('Error during fetch or streaming:', fetchError);
      
      // Add error message to chat
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.sender === 'AI Agent') {
          lastMsg.text = `Network or streaming error: ${fetchError.message || fetchError}`;
          lastMsg.trace = [{
            type: 'error',
            step: 1,
            agent: 'System',
            message: fetchError.message || 'Network error',
            details: fetchError.stack || '',
            requestId: chat_request_id,
            text: `Network Error: ${fetchError.message || fetchError}${fetchError.stack ? '\n\nDetails:\n' + fetchError.stack : ''}`
          }];
          lastMsg.expandTrace = true;
          lastMsg.timestamp = new Date().toISOString();
        }
        return updated;
      });
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const stored = localStorage.getItem('selectedAgents');
    if (stored) setSelectedAgents(JSON.parse(stored));
    const storedInstruction = localStorage.getItem('agent_instruction');
    if (storedInstruction) setInstruction(storedInstruction);
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) setMessages(JSON.parse(storedMessages));
  }, []);

  // useEffect(() => {
  //   const storedChatId = localStorage.getItem('chat_request_id');
  //   if (storedChatId) {
  //     setChatRequestId(storedChatId);
  //   } else {
  //     const newId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  //     setChatRequestId(newId);
  //     localStorage.setItem('chat_request_id', newId);
  //   }
  // }, [messages]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-white shadow p-4 text-center text-2xl font-bold">
        <Image src="/images/aws-logo.svg" alt="AWS Logo" width={150} height={50} className="mx-auto mb-2" />
        Chat with Selected Agents
      </header>

      <div className="flex flex-1 p-4 gap-4 relative">
        <aside className="w-64 bg-white p-4 rounded shadow flex flex-col justify-between">
          <div>
          <h3 className="text-lg font-semibold mb-4">Selected Agents</h3>
          {selectedAgents.map((agent, idx) => (
          <div key={idx} className="mb-4">
            <div className="flex items-center mb-1">
              <Image
                src={agent.image || agent.icon}
                alt="Agent Icon"
                width={40}
                height={40}
                className="rounded-full mr-2"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{agent.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border shadow-sm 
                      ${
                      isSupervisorChat
                        ? 'bg-purple-100 text-purple-800 border-purple-300'
                        : 'bg-gray-100 text-gray-700 border-gray-300'
                    }`}
                  >
                    {isSupervisorChat ? 'Supervisor' : 'Individual'}
                  </span>

                </div>
              </div>
            </div>

    {/* Collaborators */}
    {isSupervisorChat &&
      Array.isArray(agent.collaborators) &&
      agent.collaborators.length > 0 && (
        <div className="ml-10 mt-2 space-y-2 border-l pl-4 border-blue-300">
          {agent.collaborators.map((name, cIdx) => (
            <div key={cIdx} className="flex items-center gap-2">
              <span className="text-blue-600 text-sm">👥</span>
              <span className="text-sm text-gray-700">{name}</span>
            </div>
          ))}
        </div>
    )}
  </div>
))}


          </div>
          <div className="mt-4">
            <button
              onClick={() => {
                setMessages([]);
                localStorage.removeItem('chatMessages');
                chatRequestIdRef.current = `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
              }}              
              className="w-full text-center bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg shadow-md font-semibold transition duration-200 mb-3"
            >
              🗑️ Clear Chat
            </button>
            <a
            href="/"
            onClick={() => {
              localStorage.removeItem('chatMessages');
            }}
            className="block text-center bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white py-2 px-4 rounded-lg shadow-lg font-semibold tracking-wide transition-all duration-300 ease-in-out w-full"
          >
            ← Back to Catalog
          </a>

          </div>
        </aside>

        <main className="flex flex-1 flex-col bg-white rounded shadow">
        <div className="p-2 border-b text-right text-xs text-gray-500">
          <details open>
            <summary className="cursor-pointer underline inline-block">Edit Agent Instructions</summary>
            <textarea
              className={`w-full border rounded p-2 mt-2 ${isSupervisorChat ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300'}`}
              placeholder="Enter shared instruction for agent collaboration..."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              disabled={isSupervisorChat}
            />
            {isSupervisorChat && (
              <p className="text-red-500 text-xs mt-1">🔒 Instruction is locked while using a Supervisor agent.</p>
            )}
          </details>
        </div>
        <div className="p-2 border-b flex items-center justify-end gap-3 bg-gray-50">
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={alwaysCollapseTraces}
              onChange={(e) => setAlwaysCollapseTraces(e.target.checked)}
              className="sr-only"
            />
            <div className="w-11 h-6 bg-gray-300 rounded-full shadow-inner"></div>
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform ${alwaysCollapseTraces ? 'translate-x-5' : ''}`}
            ></div>
          </div>
          <span className="ml-3 text-sm font-semibold text-gray-700">
            {alwaysCollapseTraces ? 'Collapsed Traces' : 'Expanded Traces'}
          </span>
        </label>
      </div>
          <div className="flex-1 p-4 overflow-y-auto" id="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className="mb-4">
                {msg.trace && (
                  <details open={!alwaysCollapseTraces && msg.expandTrace} className="mt-3 border rounded-md bg-gray-50 p-3">
                    <summary className="cursor-pointer font-semibold text-blue-700">🧵 Trace Steps</summary>
                    <div className="mt-3 space-y-3">
                    {msg.trace.map((step, stepIdx) => (
                    <details key={stepIdx} open className="border rounded-lg bg-white shadow-sm p-3">
                      <summary className="cursor-pointer font-semibold text-blue-700 mb-1 text-sm">
                        ▶️ Step {step.step}
                      </summary>
                      <div className="mt-2 text-sm">
                        {step.type === 'rationale' && (
                          <div className="break-all whitespace-pre-wrap">
                            <span className="font-semibold">💡 Rationale:</span>{' '}
                            <span className="block">{step.text}</span>
                          </div>
                        )}
                        {step.type === 'agent-collaborator' && (
                          <div><span className="font-semibold">👤➡️👤 Agent - {step.agent}:</span> {step.text}</div>
                        )}
                        {step.type === 'tool' && (
                          <div>
                            <div><span className="font-semibold">🧰 Tool:</span> {step.function || step.apiPath || 'Unknown'}</div>
                            <div><span className="font-semibold">Execution:</span> {step.executionType}</div>
                          </div>
                        )}
                        {step.type === 'observation' && (
                        <div className="max-w-full break-all whitespace-pre-wrap">
                          <span className="font-semibold">📝 Observation:</span>
                          <span className="block">{step.text}</span>
                        </div>
                        )}
                        {step.type === 'sentiment-data' && (
                          <div className="max-w-full">
                            <span className="font-semibold">📊 Sentiment Data:</span>
                            <span className="block mb-2">{step.text}</span>
                            {step.data && <SentimentAnalysisResults data={step.data} />}
                          </div>
                        )}
                        {step.type === 'status' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-blue-500 text-lg">ℹ️</span>
                              <div className="text-blue-800 font-medium">{step.text}</div>
                            </div>
                          </div>
                        )}
                        {step.type === 'knowledge-base' && (
                          <div className="max-w-full break-all whitespace-pre-wrap mt-4 p-3 border rounded-md bg-gray-50">
                            <span className="font-semibold">📚 Knowledge Base Result:</span>
                            <span className="block">{step.text}</span>
                          </div>
                        )}
                        {step.type === 'placeholder' && (
                          <div className="italic text-gray-400">⏳ {step.text}</div>
                        )}
                        {step.type === 'error' && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <span className="text-red-500 text-lg">❌</span>
                              <div className="flex-1">
                                <div className="font-semibold text-red-800 mb-2">Agent Execution Error</div>
                                <div className="text-red-700 text-sm whitespace-pre-wrap break-words">
                                  {step.message || step.text || 'An unknown error occurred'}
                                </div>
                                {step.details && (
                                  <details className="mt-2">
                                    <summary className="cursor-pointer text-red-600 text-xs font-medium">
                                      Show Technical Details
                                    </summary>
                                    <pre className="mt-1 text-xs text-red-600 bg-red-100 p-2 rounded overflow-x-auto">
                                      {step.details}
                                    </pre>
                                  </details>
                                )}
                                {step.requestId && (
                                  <div className="mt-2 text-xs text-red-500">
                                    Request ID: {step.requestId}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  ))}

                    </div>
                  </details>
                )}
                {msg.text && (
                  <div className="mt-3">
                    <p className="break-all whitespace-pre-wrap">
                      <strong>{msg.sender}:</strong>
                      <span className="ml-2 text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
                    </p>
                    
                    {/* Check if this is a sentiment analysis report and render it specially */}
                    {isPRSentimentAgent && msg.sender === 'AI Agent' ? (
                      <SentimentAnalysisReport text={msg.text} />
                    ) : (
                      <div className="mt-2 break-all whitespace-pre-wrap text-gray-800">
                        {msg.text}
                      </div>
                    )}
                  </div>
                )}
                {msg.images && msg.images.length > 0 && (
                <div className="mt-2 space-y-2">
                  {msg.images.map((url, idx) => (
                    <Image
                      key={idx}
                      src={url}
                      alt={`Generated Visual ${idx + 1}`}
                      width={800}
                      height={600}
                      className="rounded shadow border"
                      unoptimized
                    />
                  ))}
                </div>
              )}
              </div>
            ))}
            {isProcessing && (
              <div className="mb-4 animate-pulse text-blue-600 italic">Waiting for response...</div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 p-3 flex">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded px-3 py-2"
              placeholder={isPRSentimentAgent ? 
                "Enter drug name for sentiment analysis (e.g., 'Analyze sentiment for Lipitor')" : 
                "Type your message..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button
              className="ml-3 bg-blue-600 text-white px-4 py-2 rounded"
              onClick={sendMessage}
            >
              Send
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}