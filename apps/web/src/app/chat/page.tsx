'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_QUESTIONS = [
  "What day can I water?",
  "I got a citation, what now?",
  "I just installed new sod",
  "What are the current restrictions?",
  "Can I test my sprinkler system?",
  "What is wasteful water use?",
  "I have reclaimed water",
  "How do I get a variance?",
];

export default function PublicChatPage() {
  const { isSignedIn } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [phaseOpen, setPhaseOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const logMessage = useCallback(async (role: string, content: string, currentSessionId: string | null) => {
    if (!isSignedIn) return currentSessionId;
    try {
      const res = await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId, role, content }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.sessionId as string;
      }
    } catch {}
    return currentSessionId;
  }, [isSignedIn]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    // Log user message
    const sid = await logMessage('user', text.trim(), sessionId);
    if (sid) setSessionId(sid);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const reply = data.content?.[0]?.text
        || data.message
        || data.text
        || 'I apologize, I could not process that. Please call PCU at (727) 464-4000.';
      setMessages([...updated, { role: 'assistant', content: reply }]);
      // Log assistant reply
      await logMessage('assistant', reply, sid);
    } catch {
      const errMsg = 'I am having trouble connecting right now. For immediate assistance, please call Pinellas County Utilities at (727) 464-4000.';
      setMessages([...updated, { role: 'assistant', content: errMsg }]);
      await logMessage('assistant', errMsg, sid);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: 'linear-gradient(160deg, #0f172a 0%, #064e3b 50%, #134e4a 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Phase Alert Banner */}
      <div
        onClick={() => setPhaseOpen(!phaseOpen)}
        className="cursor-pointer select-none"
        style={{
          background: 'linear-gradient(90deg, #dc2626 0%, #991b1b 100%)',
          color: '#fff',
          padding: '10px 20px',
          fontSize: 13,
          fontWeight: 700,
          textAlign: 'center',
          letterSpacing: '0.4px',
        }}
      >
        <span style={{ marginRight: 8 }}>&#9888;&#65039;</span>
        PHASE II WATER SHORTAGE IN EFFECT &mdash; One-Day-Per-Week Watering Through July 1, 2026
        <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.8 }}>
          {phaseOpen ? '\u25B2 Less' : '\u25BC Details'}
        </span>
      </div>

      {phaseOpen && (
        <div style={{
          background: '#1e293b',
          color: '#cbd5e1',
          padding: '14px 24px',
          fontSize: 13,
          lineHeight: 1.8,
          borderBottom: '2px solid #dc2626',
        }}>
          <span style={{ color: '#fbbf24', fontWeight: 700 }}>Modified Phase II Water Shortage</span> declared by SWFWMD due to 13.6-inch rainfall deficit. All PCU customers limited to <strong>one watering day per week</strong>.
          <br />
          <strong>North of SR580:</strong> Even addresses → Saturday | Odd → Wednesday
          <br />
          <strong>South of SR580:</strong> Even addresses → Tuesday | Odd → Thursday
          <br />
          <strong>Hours:</strong> 12:01 AM&ndash;8:00 AM or 6:00 PM&ndash;11:59 PM (under 1 acre: pick one window)
          <br />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Low-volume watering of plants/shrubs (not lawns) allowed any day/time.</span>
        </div>
      )}

      {/* Header */}
      <div className="text-center" style={{ padding: '28px 20px 16px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 14,
          background: 'rgba(255,255,255,0.04)',
          padding: '12px 24px',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0d9488, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
            boxShadow: '0 4px 24px rgba(13,148,136,0.35)',
          }}>
            &#128167;
          </div>
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
              ReUse360<span style={{ color: '#2dd4bf' }}>+</span>
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 12, margin: 0, letterSpacing: '0.2px' }}>
              Water Conservation Assistant &mdash; Pinellas County Utilities
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto" style={{
        maxWidth: 740, width: '100%', margin: '0 auto',
        padding: '0 16px 140px',
      }}>
        {/* Welcome */}
        {messages.length === 0 && (
          <>
            <div style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(10px)',
              borderRadius: 16,
              padding: '24px 22px',
              border: '1px solid rgba(255,255,255,0.1)',
              marginBottom: 16,
            }}>
              <p style={{ color: '#e2e8f0', fontSize: 15, lineHeight: 1.6, margin: '0 0 12px' }}>
                Welcome! I can help you with Pinellas County water conservation questions:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['&#128197;', 'Your watering day & schedule'],
                  ['&#9888;&#65039;', 'Phase II restrictions explained'],
                  ['&#128176;', 'Citations, fines & appeals'],
                  ['&#127793;', 'New sod/plant exemptions'],
                  ['&#128295;', 'Irrigation testing rules'],
                  ['&#9854;&#65039;', 'Reclaimed water questions'],
                  ['&#128221;', 'Variance applications'],
                  ['&#128222;', 'Who to contact at PCU'],
                ].map(([icon, label], i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)',
                  }}>
                    <span style={{ fontSize: 16 }} dangerouslySetInnerHTML={{ __html: icon }} />
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {QUICK_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={loading}
                  className="transition-all duration-200"
                  style={{
                    background: 'rgba(13,148,136,0.12)',
                    border: '1px solid rgba(13,148,136,0.35)',
                    color: '#5eead4',
                    padding: '7px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                  onMouseOver={e => { (e.target as HTMLElement).style.background = 'rgba(13,148,136,0.28)'; }}
                  onMouseOut={e => { (e.target as HTMLElement).style.background = 'rgba(13,148,136,0.12)'; }}
                >
                  {q}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 10,
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg, #0d9488, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, marginRight: 8, flexShrink: 0, marginTop: 2,
              }}>
                &#128167;
              </div>
            )}
            <div style={{
              maxWidth: '80%',
              padding: '11px 15px',
              borderRadius: msg.role === 'user'
                ? '14px 14px 3px 14px'
                : '14px 14px 14px 3px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #0d9488, #0891b2)'
                : 'rgba(255,255,255,0.07)',
              color: msg.role === 'user' ? '#fff' : '#e2e8f0',
              fontSize: 14,
              lineHeight: 1.65,
              border: msg.role === 'assistant'
                ? '1px solid rgba(255,255,255,0.1)'
                : 'none',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading dots */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0d9488, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, flexShrink: 0,
            }}>
              &#128167;
            </div>
            <div style={{
              padding: '14px 18px',
              borderRadius: '14px 14px 14px 3px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', gap: 5, alignItems: 'center',
            }}>
              {[0, 0.15, 0.3].map((delay, i) => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: '50%', background: '#2dd4bf',
                  animation: `dotPulse 1.2s ease-in-out ${delay}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input Bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(15,23,42,0.92)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '10px 16px',
      }}>
        <div style={{
          maxWidth: 740, margin: '0 auto',
          display: 'flex', gap: 10, alignItems: 'flex-end',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask about watering schedules, citations, exemptions..."
            disabled={loading}
            rows={1}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              padding: '12px 16px',
              color: '#e2e8f0',
              fontSize: 14,
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            style={{
              background: input.trim() && !loading
                ? 'linear-gradient(135deg, #0d9488, #0891b2)'
                : 'rgba(255,255,255,0.04)',
              border: 'none',
              borderRadius: 12,
              padding: '12px 22px',
              color: input.trim() && !loading ? '#fff' : '#475569',
              fontSize: 14,
              fontWeight: 600,
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            Send
          </button>
        </div>
        <p style={{
          maxWidth: 740, margin: '6px auto 2px',
          fontSize: 11, color: '#475569', textAlign: 'center',
          lineHeight: 1.4,
        }}>
          AI-powered assistant &bull; For emergencies call (727) 464-4000 &bull; Responses may not reflect real-time changes
        </p>
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
