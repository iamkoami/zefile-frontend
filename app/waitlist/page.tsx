import WaitlistPage from '@/components/WaitlistPage';

/**
 * Waitlist route — served by middleware rewrite when waitlist mode is active.
 */
export default function WaitlistRoute() {
  return <WaitlistPage />;
}
