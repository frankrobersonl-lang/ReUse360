'use client';

import { ViolationTrendChart } from './ViolationTrendChart';
import { ViolationTypeChart } from './ViolationTypeChart';

interface Props {
  trendData: { week: string; count: number }[];
  typeData: { type: string; count: number }[];
}

export function ViolationTrendsCharts({ trendData, typeData }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Weekly Violation Trend (Last 90 Days)
        </h2>
        <ViolationTrendChart data={trendData} />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Violations by Type
        </h2>
        <ViolationTypeChart data={typeData} />
      </div>
    </div>
  );
}
