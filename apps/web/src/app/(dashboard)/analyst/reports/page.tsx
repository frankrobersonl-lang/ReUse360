import { requireAnalyst } from '@/lib/auth.server';
import { ReportsClient } from './ReportsClient';

export default async function AnalystReportsPage() {
  await requireAnalyst();

  return <ReportsClient />;
}
