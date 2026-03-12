'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Building2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountRow {
  id: string;
  accountId: string;
  firstName: string;
  lastName: string;
  serviceAddress: string;
  isReclaimed: boolean;
  isActive: boolean;
  complianceStatus: 'COMPLIANT' | 'WARNING' | 'VIOLATION';
  violationCount: number;
  incentiveCount: number;
}

const STATUS_STYLES: Record<string, string> = {
  COMPLIANT: 'bg-green-50  text-green-700  border-green-200',
  WARNING:   'bg-amber-50  text-amber-700  border-amber-200',
  VIOLATION: 'bg-red-50    text-red-700    border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  COMPLIANT: 'Compliant',
  WARNING:   'Warning',
  VIOLATION: 'Violation',
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const url = q ? `/api/accounts?q=${encodeURIComponent(q)}` : '/api/accounts';
      const res = await fetch(url);
      if (res.ok) setAccounts(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchAccounts(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchAccounts]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage irrigation customer accounts — Pinellas County Utilities
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users className="w-4 h-4" />
          <span>{accounts.length} accounts</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, address, or account number…"
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Number</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Type</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Compliance</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Violations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">Loading…</td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">
                    No customer accounts found
                  </td>
                </tr>
              ) : (
                accounts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/accounts/${a.id}`} className="font-mono text-sm font-medium text-teal-700 hover:text-teal-600">
                        {a.accountId}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {a.firstName} {a.lastName}
                    </td>
                    <td className="px-5 py-3 text-slate-600 max-w-xs truncate">{a.serviceAddress}</td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-semibold border',
                        a.isReclaimed
                          ? 'bg-teal-50 text-teal-700 border-teal-200'
                          : 'bg-sky-50 text-sky-700 border-sky-200',
                      )}>
                        {a.isReclaimed ? 'Reclaimed' : 'Potable'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-semibold border',
                        STATUS_STYLES[a.complianceStatus],
                      )}>
                        {STATUS_LABELS[a.complianceStatus]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-600">{a.violationCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
