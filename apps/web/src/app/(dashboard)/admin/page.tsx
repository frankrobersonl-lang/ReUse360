import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { KpiCard } from '@/components/ui/KpiCard';
import { Users, Activity, AlertTriangle, Gauge } from 'lucide-react';

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">ReUse360 Plus — Pinellas County Water Conservation</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Users" value="—" icon={Users} />
        <KpiCard title="Active Jobs" value="—" icon={Activity} />
        <KpiCard title="Open Violations" value="—" icon={AlertTriangle} />
        <KpiCard title="Total Meters" value="—" icon={Gauge} />
      </div>
    </div>
  );
}