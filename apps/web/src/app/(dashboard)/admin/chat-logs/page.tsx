'use client'

import { useState, useEffect } from 'react'

interface ChatMessage {
  id: string
  role: string
  content: string
  createdAt: string
}

interface ChatSession {
  id: string
  userId: string | null
  userEmail: string | null
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
  _count: { messages: number }
}

export default function ChatLogsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/chat-sessions?limit=50')
      .then(r => r.json())
      .then(data => {
        setSessions(data.sessions ?? [])
        setTotal(data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Chat Session Logs</h1>
        <p className="text-sm text-slate-500 mt-1">
          Public records compliance &mdash; {total} total session{total !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm py-12 text-center">Loading sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          No chat sessions recorded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => {
            const isExpanded = expandedId === session.id
            const firstUserMsg = session.messages.find(m => m.role === 'user')
            return (
              <div key={session.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-semibold text-slate-800">
                        {session.userEmail ?? 'Unknown user'}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        {session._count.messages} message{session._count.messages !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {firstUserMsg?.content ?? 'No user messages'}
                    </p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="text-xs text-slate-400">
                      {new Date(session.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-slate-300">
                      {new Date(session.createdAt).toLocaleTimeString('en-US', {
                        hour: 'numeric', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 space-y-3 max-h-96 overflow-y-auto">
                    <div className="text-xs text-slate-400 mb-2">
                      Session ID: <span className="font-mono">{session.id}</span> &bull; User ID: <span className="font-mono">{session.userId ?? 'n/a'}</span>
                    </div>
                    {session.messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-teal-600 text-white rounded-br-sm'
                            : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm'
                        }`}>
                          {msg.content}
                          <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-teal-200' : 'text-slate-300'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
