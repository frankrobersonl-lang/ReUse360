import { requireEnforcement } from '@/lib/auth.server';
import { IncidentMapLoader }  from '@/components/IncidentMapLoader';

export default async function MapPage() {
  await requireEnforcement();
  return (
    <div className="h-full -m-6">
      <IncidentMapLoader />
    </div>
  );
}
