'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search, X } from 'lucide-react'

export function ViolationSearch({ currentSearch, currentStatus }: { currentSearch: string; currentStatus: string }) {
  const router = useRouter()
  const [query, setQuery] = useState(currentSearch)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('search', query.trim())
    if (currentStatus) params.set('status', currentStatus)
    router.push(`/enforcement/violations${params.toString() ? `?${params}` : ''}`)
  }

  function clear() {
    setQuery('')
    const params = new URLSearchParams()
    if (currentStatus) params.set('status', currentStatus)
    router.push(`/enforcement/violations${params.toString() ? `?${params}` : ''}`)
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by case number, address, or parcel ID..."
          className="w-full pl-10 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        {query && (
          <button type="button" onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-sm font-medium text-slate-700 rounded-lg transition-colors"
      >
        Search
      </button>
    </form>
  )
}
