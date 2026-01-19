import React, { useState, useEffect, useRef } from 'react';
import {
    Bot,
    Send,
    Settings2,
    User,
    Plus,
    Trash2,
    MessageSquare,
    Sparkles,
    Terminal,
    RefreshCw,
    AlertCircle,
    Menu,
    X,
    Clock
} from 'lucide-react';

// API Configuration
const apiKey = "";
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";

const App = () => {
    // State for Agents
    const [agents, setAgents] = useState([
        {
            id: '1',
            name: 'General Assistant',
            role: 'Helpful and concise AI companion',
            systemPrompt: 'You are a helpful, versatile AI assistant. Provide clear, accurate, and concise answers.',
            icon: <Bot className="w-5 h-5" />,
            color: 'bg-blue-500'
        },
        {
            id: '2',
            name: 'Code Master',
            role: 'Expert software engineer and debugger',
            systemPrompt: 'You are an expert software engineer. When asked for code, provide clean, efficient, and well-commented solutions. Explain your logic briefly.',
            icon: <Terminal className="w-5 h-5" />,
            color: 'bg-emerald-500'
        }
    ]);

    const [activeAgentId, setActiveAgentId] = useState('1');
    const [messages, setMessages] = useState({}); // Stores messages per agent: { agentId: [msg, msg] }
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState(null);

    const scrollRef = useRef(null);
    const activeAgent = agents.find(a => a.id === activeAgentId) || agents[0];

    // Auto-scroll chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, activeAgentId]);

    // Exponential Backoff API Call
    const callGemini = async (prompt, systemInstruction, retries = 0) => {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    systemInstruction: { parts: [{ text: systemInstruction }] }
                })
            });

            if (!response.ok) {
                if (response.status === 429 && retries < 5) {
                    const delay = Math.pow(2, retries) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return callGemini(prompt, systemInstruction, retries + 1);
                }
                throw new Error(`API Error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
        } catch (err) {
            if (retries < 5) {
                const delay = Math.pow(2, retries) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return callGemini(prompt, systemInstruction, retries + 1);
            }
            throw err;
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMsg = { role: 'user', content: inputValue };
        const currentAgentMsgs = messages[activeAgentId] || [];

        setMessages(prev => ({
            ...prev,
            [activeAgentId]: [...currentAgentMsgs, userMsg]
        }));
        setInputValue('');
        setIsLoading(true);
        setError(null);

        try {
            // For a true "agent" experience, we'd pass history, but for this demo, 
            // we'll focus on the prompt + instruction.
            const aiResponseText = await callGemini(inputValue, activeAgent.systemPrompt);

            const aiMsg = { role: 'assistant', content: aiResponseText };
            setMessages(prev => ({
                ...prev,
                [activeAgentId]: [...(prev[activeAgentId] || []), aiMsg]
            }));
        } catch (err) {
            setError("Failed to get response after multiple attempts. Please check your connection.");
        } finally {
            setIsLoading(false);
        }
    };

    const createNewAgent = () => {
        const newAgent = {
            id: Date.now().toString(),
            name: 'New Agent',
            role: 'Define a role...',
            systemPrompt: 'You are a helpful assistant.',
            icon: <Sparkles className="w-5 h-5" />,
            color: 'bg-purple-500'
        };
        setAgents([...agents, newAgent]);
        setActiveAgentId(newAgent.id);
        setIsEditing(true);
    };

    const updateAgent = (updatedFields) => {
        setAgents(agents.map(a => a.id === activeAgentId ? { ...a, ...updatedFields } : a));
    };

    const deleteAgent = (id) => {
        if (agents.length <= 1) return;
        const newAgents = agents.filter(a => a.id !== id);
        setAgents(newAgents);
        setActiveAgentId(newAgents[0].id);
    };

    const currentChat = messages[activeAgentId] || [];

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">

            {/* Sidebar */}
            <aside
                className={`${showSidebar ? 'w-80' : 'w-0'
                    } transition-all duration-300 bg-white border-r border-slate-200 flex flex-col overflow-hidden relative`}
            >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl text-indigo-600">
                        <Bot className="w-8 h-8" />
                        <span>AgentStudio</span>
                    </div>
                    <button
                        onClick={() => setShowSidebar(false)}
                        className="p-1 hover:bg-slate-100 rounded-md lg:hidden"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    <button
                        onClick={createNewAgent}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-600 border border-indigo-100 p-3 rounded-xl hover:bg-indigo-100 transition-colors font-medium mb-6"
                    >
                        <Plus className="w-4 h-4" /> New Agent
                    </button>

                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">Your Agents</h3>
                        {agents.map((agent) => (
                            <button
                                key={agent.id}
                                onClick={() => {
                                    setActiveAgentId(agent.id);
                                    setIsEditing(false);
                                }}
                                className={`w-full group flex items-center gap-3 p-3 rounded-xl transition-all ${activeAgentId === agent.id
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'hover:bg-slate-100 text-slate-600'
                                    }`}
                            >
                                <div className={`p-2 rounded-lg ${activeAgentId === agent.id ? 'bg-indigo-500' : 'bg-slate-100'}`}>
                                    {React.cloneElement(agent.icon, { className: `w-4 h-4 ${activeAgentId === agent.id ? 'text-white' : 'text-slate-500'}` })}
                                </div>
                                <div className="flex-1 text-left truncate">
                                    <div className="font-semibold text-sm truncate">{agent.name}</div>
                                    <div className={`text-xs truncate ${activeAgentId === agent.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                                        {agent.role}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Powered by Gemini 2.5 Flash
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative bg-white">

                {/* Header */}
                <header className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-4">
                        {!showSidebar && (
                            <button onClick={() => setShowSidebar(true)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <Menu className="w-5 h-5 text-slate-500" />
                            </button>
                        )}
                        <div>
                            <h2 className="font-bold text-slate-800">{activeAgent.name}</h2>
                            <p className="text-xs text-slate-400">{activeAgent.role}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-100 text-slate-500'}`}
                            title="Agent Settings"
                        >
                            <Settings2 className="w-5 h-5" />
                        </button>
                        {agents.length > 1 && (
                            <button
                                onClick={() => deleteAgent(activeAgentId)}
                                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                title="Delete Agent"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </header>

                {/* Workspace Area */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Chat Panel */}
                    <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${isEditing ? 'w-1/2' : 'w-full'}`}>
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
                        >
                            {currentChat.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 opacity-60">
                                    <div className={`p-4 rounded-3xl ${activeAgent.color} text-white mb-4`}>
                                        {activeAgent.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800">Hello! I'm {activeAgent.name}</h3>
                                    <p className="text-slate-500">
                                        I've been configured as your {activeAgent.role.toLowerCase()}.
                                        What can I help you with today?
                                    </p>
                                </div>
                            ) : (
                                currentChat.map((msg, i) => (
                                    <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'assistant' && (
                                            <div className={`w-8 h-8 rounded-lg ${activeAgent.color} flex items-center justify-center text-white shrink-0 mt-1`}>
                                                {activeAgent.icon}
                                            </div>
                                        )}
                                        <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user'
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-800 border border-slate-200 shadow-sm'
                                            }`}>
                                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                                {msg.content}
                                            </div>
                                        </div>
                                        {msg.role === 'user' && (
                                            <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 shrink-0 mt-1">
                                                <User className="w-5 h-5" />
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}

                            {isLoading && (
                                <div className="flex gap-4">
                                    <div className={`w-8 h-8 rounded-lg ${activeAgent.color} flex items-center justify-center text-white shrink-0 animate-pulse`}>
                                        {activeAgent.icon}
                                    </div>
                                    <div className="bg-slate-100 rounded-2xl p-4 flex items-center gap-2 text-slate-400">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span className="text-xs font-medium">Thinking...</span>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="flex justify-center">
                                    <div className="bg-red-50 text-red-600 px-4 py-2 rounded-full text-xs flex items-center gap-2 border border-red-100">
                                        <AlertCircle className="w-4 h-4" /> {error}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-6 border-t border-slate-100 bg-white">
                            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative group">
                                <input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder={`Message ${activeAgent.name}...`}
                                    disabled={isLoading}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim() || isLoading}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-sm"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                            <p className="text-[10px] text-center text-slate-400 mt-4">
                                Agents may provide inaccurate information. Always verify important details.
                            </p>
                        </div>
                    </div>

                    {/* Settings Panel (Conditional) */}
                    {isEditing && (
                        <div className="w-1/2 border-l border-slate-100 bg-slate-50/50 p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <Settings2 className="w-5 h-5 text-indigo-500" />
                                    Agent Configuration
                                </h3>
                                <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-slate-200 rounded-md">
                                    <X className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Display Name</label>
                                    <input
                                        type="text"
                                        value={activeAgent.name}
                                        onChange={(e) => updateAgent({ name: e.target.value })}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Role Label</label>
                                    <input
                                        type="text"
                                        value={activeAgent.role}
                                        onChange={(e) => updateAgent({ role: e.target.value })}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                                        placeholder="e.g. Creative Assistant"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">System Instructions (Prompt)</label>
                                    <div className="relative">
                                        <textarea
                                            rows={8}
                                            value={activeAgent.systemPrompt}
                                            onChange={(e) => updateAgent({ systemPrompt: e.target.value })}
                                            className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-sm font-mono leading-relaxed"
                                            placeholder="Describe how the agent should behave..."
                                        />
                                        <div className="absolute bottom-3 right-3 text-[10px] text-slate-400 pointer-events-none">
                                            AI Identity Core
                                        </div>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-400 leading-relaxed italic">
                                        "This prompt defines the core personality and rules for this agent. Be specific about tone, expertise, and format."
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-slate-200">
                                    <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 flex gap-3">
                                        <Clock className="w-5 h-5 text-indigo-500 shrink-0" />
                                        <div className="text-xs text-indigo-700">
                                            <p className="font-bold mb-1">State Persistance</p>
                                            Changes made to agent configurations are currently stored in local memory.
                                            Would you like to enable cloud synchronization for your agents?
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;