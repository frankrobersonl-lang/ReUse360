'use client';
import dynamic from 'next/dynamic';
import type { ViolationMapProps } from './ViolationMap';

const ViolationMap = dynamic(() => import('./ViolationMap'), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200"
      style={{ height: '600px' }}
    >
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading violation map...</span>
      </div>
    </div>
  ),
});

export default function ViolationMapLoader(props: ViolationMapProps) {
  return <ViolationMap {...props} />;
}
