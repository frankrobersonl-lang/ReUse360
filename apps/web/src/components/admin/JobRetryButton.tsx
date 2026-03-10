'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function JobRetryButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRetry() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/retry`, { method: 'POST' });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRetry}
      disabled={loading}
      className="text-xs text-teal-600 hover:text-teal-700 font-medium disabled:opacity-50 whitespace-nowrap"
    >
      {loading ? 'Retrying...' : 'Retry'}
    </button>
  );
}
