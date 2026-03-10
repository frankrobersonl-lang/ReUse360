'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

interface DataPoint {
  zone: string;
  count: number;
}

const ZONE_COLORS: Record<string, string> = {
  ODD:       '#0d9488',
  EVEN:      '#0891b2',
  MON_THU:   '#6366f1',
  TUE_FRI:   '#8b5cf6',
  WED_SAT:   '#d946ef',
  RECLAIMED: '#22c55e',
};
const FALLBACK_COLOR = '#94a3b8';

export function ZoneUsageChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-slate-400">
        No zone data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="zone"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={(v: string) => v.replace(/_/g, ' ')}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          allowDecimals={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
          labelFormatter={(v: string) => v.replace(/_/g, ' ')}
          formatter={(value: number) => [value, 'Parcels']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry) => (
            <Cell
              key={entry.zone}
              fill={ZONE_COLORS[entry.zone] ?? FALLBACK_COLOR}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
