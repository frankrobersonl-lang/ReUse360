'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface DataPoint {
  name: string;
  count: number;
  amount: number;
}

export function IncentiveChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Incentives by Type
      </h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barGap={8}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
            formatter={(value: number, name: string) => [
              name === 'amount' ? `$${value.toLocaleString()}` : value,
              name === 'amount' ? 'Total Amount' : 'Count',
            ]}
          />
          <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} name="count" />
          <Bar dataKey="amount" fill="#22c55e" radius={[4, 4, 0, 0]} name="amount" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
