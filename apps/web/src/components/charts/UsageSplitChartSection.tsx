'use client';

import { UsageSplitChart } from './UsageSplitChart';

interface Props {
  data: { name: string; value: number }[];
}

export function UsageSplitChartSection({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Reclaimed vs Potable Flow (Last 90 Days)
      </h2>
      <UsageSplitChart data={data} />
    </div>
  );
}
