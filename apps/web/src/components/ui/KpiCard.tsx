import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label:     string;
  value:     string | number;
  sub?:      string;
  icon:      LucideIcon;
  trend?:    { value: number; label: string };
  variant?:  'default' | 'warning' | 'danger' | 'success';
  loading?:  boolean;
}

const VARIANTS = {
  default: { icon: 'bg-teal-50 text-teal-600',   border: 'border-slate-200' },
  warning: { icon: 'bg-amber-50 text-amber-600',  border: 'border-amber-200' },
  danger:  { icon: 'bg-red-50 text-red-600',      border: 'border-red-200'   },
  success: { icon: 'bg-green-50 text-green-600',  border: 'border-green-200' },
};

export function KpiCard({ label, value, sub, icon: Icon, trend, variant = 'default', loading }: KpiCardProps) {
  const style = VARIANTS[variant];

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
        <div className="h-3 w-24 bg-slate-100 rounded mb-4" />
        <div className="h-8 w-16 bg-slate-100 rounded mb-2" />
        <div className="h-3 w-32 bg-slate-100 rounded" />
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-xl border p-5 flex flex-col gap-3', style.border)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', style.icon)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {trend && (
        <p className={cn('text-xs font-medium', trend.value >= 0 ? 'text-red-600' : 'text-green-600')}>
          {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
        </p>
      )}
    </div>
  );
}
