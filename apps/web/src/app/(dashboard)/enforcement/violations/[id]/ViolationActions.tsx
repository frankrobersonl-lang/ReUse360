'use client';

import { useRouter }  from 'next/navigation';
import { toast }      from 'sonner';
import { useState }   from 'react';

export function ConfirmViolationButton({ violationId }: { violationId: string }) {
  const router  = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      const res = await fetch(`/api/violations/${violationId}/confirm`, { method: 'PATCH' });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Violation confirmed');
      router.refresh();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to confirm');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleConfirm}
      disabled={busy}
      className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
    >
      {busy ? 'Confirming…' : 'Confirm Violation'}
    </button>
  );
}

export function CreateSRButton({ violationId }: { violationId: string }) {
  const router  = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleCreateSR() {
    setBusy(true);
    try {
      const res = await fetch(`/api/violations/${violationId}/create-sr`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      toast.success(`Cityworks SR created: ${data.srId}`);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to create SR');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleCreateSR}
      disabled={busy}
      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
    >
      {busy ? 'Creating SR…' : 'Create Cityworks SR'}
    </button>
  );
}
