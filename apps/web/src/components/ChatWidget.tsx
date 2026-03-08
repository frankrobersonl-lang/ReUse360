"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm the ReUse360™ Water Conservation Assistant. I can help you understand your watering schedule, restrictions, and how to stay in compliance. What's your question?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });
      if (!response.ok) throw new Error("API request failed");
      const data = await response.json();
      setMessages([...updatedMessages, { role: "assistant", content: data.message }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages([...updatedMessages, { role: "assistant", content: "I'm sorry, I encountered an error. Please try again or contact PCU at (727) 464-4000." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Keyframe animations */}
      <style>{`
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes dropBounce {
          0%, 100% { transform: translateY(0); }
          15% { transform: translateY(-10px); }
          30% { transform: translateY(0); }
          42% { transform: translateY(-5px); }
          54% { transform: translateY(0); }
        }
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Water Drop Sinker Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="Open water conservation chat assistant"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: 64, height: 64 }}
      >
        {/* The droplet container — ripples + drop live here */}
        <div
          className={`relative w-16 h-16 flex items-center justify-center transition-transform duration-300 overflow-visible ${isOpen ? 'scale-90' : 'animate-[dropBounce_3s_ease-in-out_infinite]'}`}
          style={{ filter: 'drop-shadow(0 6px 20px rgba(14,116,210,0.45))' }}
        >
          {/* Ripple rings — centered on the bulb of the drop (y≈48 in the 64px viewbox) */}
          {!isOpen && (
            <>
              <span
                className="absolute rounded-full pointer-events-none"
                style={{
                  top: 16, left: 0, width: 64, height: 64,
                  background: 'radial-gradient(circle, rgba(56,189,248,0.35) 0%, rgba(56,189,248,0) 70%)',
                  animation: 'ripple 2.4s ease-out infinite',
                }}
              />
              <span
                className="absolute rounded-full pointer-events-none"
                style={{
                  top: 16, left: 0, width: 64, height: 64,
                  background: 'radial-gradient(circle, rgba(56,189,248,0.25) 0%, rgba(56,189,248,0) 70%)',
                  animation: 'ripple 2.4s ease-out 0.8s infinite',
                }}
              />
              <span
                className="absolute rounded-full pointer-events-none"
                style={{
                  top: 16, left: 0, width: 64, height: 64,
                  background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, rgba(56,189,248,0) 70%)',
                  animation: 'ripple 2.4s ease-out 1.6s infinite',
                }}
              />
            </>
          )}

          {/* SVG water drop shape */}
          <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="dropGrad" x1="0" y1="0" x2="0.3" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
              <radialGradient id="dropShine" cx="0.35" cy="0.3" r="0.5">
                <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>
            {/* Drop shape */}
            <path
              d="M32 4 C32 4, 8 32, 8 42 C8 55.255 18.745 62 32 62 C45.255 62 56 55.255 56 42 C56 32, 32 4, 32 4Z"
              fill="url(#dropGrad)"
            />
            {/* Shine overlay */}
            <path
              d="M32 4 C32 4, 8 32, 8 42 C8 55.255 18.745 62 32 62 C45.255 62 56 55.255 56 42 C56 32, 32 4, 32 4Z"
              fill="url(#dropShine)"
            />
            {/* Specular glint */}
            <ellipse cx="22" cy="30" rx="5" ry="7" fill="rgba(255,255,255,0.3)" transform="rotate(-20 22 30)" />
          </svg>

          {/* Icon inside the drop */}
          <div className="relative z-10 text-white">
            {isOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mt-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <span className="text-2xl mt-2 block" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                &#128167;
              </span>
            )}
          </div>
        </div>

        {/* Hover tooltip */}
        {!isOpen && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2.5 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg">
            Ask about water rules
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-[chatSlideUp_0.3s_ease-out]">
          <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-lg">
              &#128167;
            </div>
            <div>
              <p className="text-white font-semibold text-sm">ReUse360+ Assistant</p>
              <p className="text-sky-200 text-xs">Pinellas County Water Conservation</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-sky-200 text-xs">Online</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80 bg-gray-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-sky-600 text-white rounded-br-sm" : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm"}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-3 py-2 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto">
            {["My watering days?", "Watering hours?", "Report a violation"].map((prompt) => (
              <button key={prompt} onClick={() => setInput(prompt)} className="flex-shrink-0 text-xs bg-sky-50 text-sky-700 px-3 py-1 rounded-full border border-sky-200 hover:bg-sky-100 transition-colors">{prompt}</button>
            ))}
          </div>

          <div className="px-3 py-3 bg-white border-t border-gray-200 flex gap-2">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask about watering schedules..." className="flex-1 text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" disabled={isLoading} />
            <button onClick={sendMessage} disabled={!input.trim() || isLoading} className="bg-sky-600 hover:bg-sky-700 disabled:bg-gray-300 text-white p-2 rounded-xl transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </div>

          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">PCU Customer Service: (727) 464-4000 &bull; <a href="https://watermatters.org" target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline">watermatters.org</a></p>
          </div>
        </div>
      )}
    </>
  );
}
