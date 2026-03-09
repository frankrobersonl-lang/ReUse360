'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, AlertTriangle, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

const VIOLATION_TYPES = [
  { value: 'WRONG_DAY', label: 'Wrong Day' },
  { value: 'WRONG_TIME', label: 'Wrong Time' },
  { value: 'EXCESSIVE_USAGE', label: 'Excessive Usage' },
  { value: 'CONTINUOUS_FLOW', label: 'Continuous Flow' },
  { value: 'LEAK_DETECTED', label: 'Leak Detected' },
  { value: 'PROHIBITED_IRRIGATION', label: 'Prohibited Irrigation' },
]

interface ParcelResult {
  parcelId: string
  ownerName: string
  address: string
  accountNumber: string
  waterSource: string
  irrigationDay: string
  wateringZone: string
}

export default function NewViolationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [lookupQuery, setLookupQuery] = useState('')
  const [lookupResult, setLookupResult] = useState<ParcelResult | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    parcelId: '',
    accountId: '',
    meterId: '',
    address: '',
    violationType: 'WRONG_DAY',
    wateringDay: '',
    wateringZone: '',
    readValue: '',
    notes: '',
  })

  // Prefill from parcel lookup query param
  useEffect(() => {
    const prefill = searchParams.get('parcelId')
    if (prefill) {
      setLookupQuery(prefill)
      doLookup(prefill)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function doLookup(query?: string) {
    const q = (query ?? lookupQuery).trim()
    if (!q) return
    setLookupLoading(true)
    try {
      const res = await fetch(`/api/parcel-lookup?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.result) {
        setLookupResult(data.result)
        setForm(f => ({
          ...f,
          parcelId: data.result.parcelId,
          accountId: data.result.accountNumber,
          meterId: data.result.accountNumber, // placeholder — real meter ID from Beacon AMI
          address: data.result.address,
          wateringDay: data.result.irrigationDay,
          wateringZone: data.result.wateringZone,
        }))
      } else {
        setLookupResult(null)
      }
    } catch {
      setLookupResult(null)
    } finally {
      setLookupLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.parcelId || !form.accountId || !form.violationType) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/violations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcelId: form.parcelId,
          accountId: form.accountId,
          meterId: form.meterId || form.accountId,
          violationType: form.violationType,
          wateringDay: form.wateringDay || null,
          wateringZone: form.wateringZone || null,
          readValue: parseFloat(form.readValue) || 0,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create violation')
      }
      const violation = await res.json()
      router.push(`/enforcement/violations/${violation.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create violation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/enforcement/violations" className="flex items-center gap-1 text-xs text-slate-500 hover:text-teal-600">
          <ChevronLeft className="w-3.5 h-3.5" />
          Violations
        </Link>
        <span className="text-xs text-slate-300">/</span>
        <span className="text-xs font-medium text-slate-900">New Violation</span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Log New Violation
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">A case number will be auto-generated on submit.</p>
      </div>

      {/* Parcel Lookup */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Property Lookup</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={lookupQuery}
              onChange={e => setLookupQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), doLookup())}
              placeholder="Search address, parcel ID, or account..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="button"
            onClick={() => doLookup()}
            disabled={lookupLoading}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {lookupLoading ? 'Searching...' : 'Lookup'}
          </button>
        </div>
        {lookupResult && (
          <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 text-sm text-teal-800">
            <p className="font-semibold">{lookupResult.ownerName}</p>
            <p className="text-teal-600">{lookupResult.address}</p>
            <p className="text-xs text-teal-500 mt-1">
              Parcel: {lookupResult.parcelId} &bull; Account: {lookupResult.accountNumber} &bull; {lookupResult.waterSource} &bull; Day: {lookupResult.irrigationDay}
            </p>
          </div>
        )}
      </div>

      {/* Violation Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Violation Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide">Parcel ID *</label>
            <input
              type="text"
              required
              value={form.parcelId}
              onChange={e => setForm(f => ({ ...f, parcelId: e.target.value }))}
              className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide">Account ID *</label>
            <input
              type="text"
              required
              value={form.accountId}
              onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
              className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide">Meter ID *</label>
            <input
              type="text"
              required
              value={form.meterId}
              onChange={e => setForm(f => ({ ...f, meterId: e.target.value }))}
              className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide">Violation Type *</label>
            <select
              required
              value={form.violationType}
              onChange={e => setForm(f => ({ ...f, violationType: e.target.value }))}
              className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {VIOLATION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide">Watering Day</label>
            <input
              type="text"
              value={form.wateringDay}
              onChange={e => setForm(f => ({ ...f, wateringDay: e.target.value }))}
              placeholder="e.g. Wednesday"
              className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide">Zone</label>
            <input
              type="text"
              value={form.wateringZone}
              onChange={e => setForm(f => ({ ...f, wateringZone: e.target.value }))}
              placeholder="ODD / EVEN"
              className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide">Read Value</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.readValue}
              onChange={e => setForm(f => ({ ...f, readValue: e.target.value }))}
              placeholder="Gallons"
              className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wide">Officer Notes</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Describe the violation observation, evidence, conditions..."
            className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !form.parcelId || !form.accountId}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {submitting ? 'Creating...' : 'Create Violation'}
          </button>
          <Link href="/enforcement/violations" className="text-sm text-slate-500 hover:text-slate-700">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
