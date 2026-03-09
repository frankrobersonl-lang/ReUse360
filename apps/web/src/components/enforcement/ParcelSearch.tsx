'use client'

import { useState } from 'react'
import { Search, X, Droplets, AlertTriangle, FileText, MapPin, Calendar, User } from 'lucide-react'

interface ParcelResult {
  parcelId: string
  ownerName: string
  address: string
  accountNumber: string
  waterSource: string
  lastViolationDate: string | null
  violationCount: number
  citationStatus: string
  irrigationDay: string
  wateringZone: string
}

const SOURCE_STYLE: Record<string, { bg: string; text: string }> = {
  Reclaimed: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  Potable: { bg: 'bg-sky-50', text: 'text-sky-700' },
  'Well/Lake': { bg: 'bg-amber-50', text: 'text-amber-700' },
}

export function ParcelSearch() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<ParcelResult | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(false)

  async function search(e?: React.FormEvent) {
    e?.preventDefault()
    if (!query.trim() || loading) return
    setLoading(true)
    setNotFound(false)
    setResult(null)

    try {
      const res = await fetch(`/api/parcel-lookup?q=${encodeURIComponent(query.trim())}`)
      if (!res.ok) throw new Error('Lookup failed')
      const data = await res.json()
      if (data.result) {
        setResult(data.result)
      } else {
        setNotFound(true)
      }
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  function clear() {
    setQuery('')
    setResult(null)
    setNotFound(false)
  }

  const srcStyle = result ? SOURCE_STYLE[result.waterSource] ?? { bg: 'bg-slate-50', text: 'text-slate-600' } : null

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <form onSubmit={search} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search address, parcel ID, owner name, or account number..."
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            {query && (
              <button type="button" onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {loading ? 'Searching...' : 'Lookup'}
          </button>
        </div>
      </form>

      {/* Not found */}
      {notFound && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-700">
          No matching parcel found for &ldquo;{query}&rdquo;. Try a different address, parcel ID, or owner name.
        </div>
      )}

      {/* Result card */}
      {result && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-slate-400" />
                <h3 className="text-base font-semibold text-slate-900">{result.ownerName}</h3>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin className="w-3.5 h-3.5" />
                {result.address}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${srcStyle?.bg} ${srcStyle?.text}`}>
                <Droplets className="w-3 h-3" />
                {result.waterSource}
              </span>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Account #</p>
              <p className="text-sm font-medium text-slate-800 font-mono">{result.accountNumber}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Parcel ID</p>
              <p className="text-sm font-medium text-slate-800 font-mono">{result.parcelId}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Watering Day</p>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-500" />
                <p className="text-sm font-medium text-slate-800">{result.irrigationDay}</p>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Zone: {result.wateringZone}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Citation Status</p>
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-sm font-medium text-slate-800">{result.citationStatus}</p>
              </div>
            </div>
          </div>

          {/* Violation summary */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className={`w-4 h-4 ${result.violationCount > 0 ? 'text-amber-500' : 'text-green-500'}`} />
              <span className="text-slate-600">
                <span className="font-semibold text-slate-800">{result.violationCount}</span> violation{result.violationCount !== 1 ? 's' : ''} on record
              </span>
              {result.lastViolationDate && (
                <span className="text-slate-400">
                  &mdash; last on {new Date(result.lastViolationDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
