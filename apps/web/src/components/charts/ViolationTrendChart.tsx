'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface DataPoint {
  week: string;
  count: number;
}

export function ViolationTrendChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-slate-400">
        No violation trend data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={(v: string) => {
            const d = new Date(v + 'T00:00:00');
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }}
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
          labelFormatter={(v: string) => {
            const d = new Date(v + 'T00:00:00');
            return `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
          }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#0d9488"
          strokeWidth={2}
          dot={{ r: 3, fill: '#0d9488' }}
          activeDot={{ r: 5, strokeWidth: 0 }}
          name="Violations"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
