'use client';

import { useEffect, useState } from 'react';
import { ViolationTrendChart } from './ViolationTrendChart';
import { ZoneUsageChart } from './ZoneUsageChart';
import { UsageSplitChart } from './UsageSplitChart';
import { ViolationTypeChart } from './ViolationTypeChart';

interface ChartData {
  violationTrend: { week: string; count: number }[];
  zoneUsage: { zone: string; count: number }[];
  usageSplit: { name: string; value: number }[];
  violationsByType: { type: string; count: number }[];
}

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
      <div className="h-4 w-40 bg-slate-100 rounded mb-6" />
      <div className="h-64 bg-slate-50 rounded" />
    </div>
  );
}

export function AnalystCharts() {
  const [data, setData] = useState<ChartData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analyst/charts')
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 text-center">
        <p className="text-sm text-red-600">Failed to load chart data ({error})</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Violation Trends (Last 90 Days)
        </h2>
        <ViolationTrendChart data={data.violationTrend} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Parcels by Watering Zone
        </h2>
        <ZoneUsageChart data={data.zoneUsage} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Reclaimed vs Potable Flow
        </h2>
        <UsageSplitChart data={data.usageSplit} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Violations by Type (Last 90 Days)
        </h2>
        <ViolationTypeChart data={data.violationsByType} />
      </div>
    </div>
  );
}
