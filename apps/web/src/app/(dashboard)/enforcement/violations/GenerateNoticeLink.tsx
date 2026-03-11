'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';

export function GenerateNoticeLink({ violationId }: { violationId: string }) {
  const [busy, setBusy] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/violations/${violationId}/notice`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'violation-notice.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-teal-600 font-medium transition-colors disabled:opacity-50"
      title="Generate Notice PDF"
    >
      <FileDown className="w-3.5 h-3.5" />
      {busy ? '…' : 'Notice'}
    </button>
  );
}
