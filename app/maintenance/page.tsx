export const runtime = 'edge';

import { headers } from 'next/headers';
import MaintenancePage from '@/components/MaintenancePage';

/**
 * Maintenance route — served by middleware rewrite when maintenance mode is active.
 * Reads maintenance message/estimate from middleware-injected headers.
 */
export default async function MaintenanceRoute() {
  const headersList = await headers();
  const message = headersList.get('x-maintenance-message') || undefined;
  const estimate = headersList.get('x-maintenance-estimate') || undefined;

  return <MaintenancePage message={message} estimate={estimate} />;
}
