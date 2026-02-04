'use client';

/**
 * GlobalSideDrawer - Global wrapper for SideDrawer component
 * Rendered in the root layout to make the drawer available on all pages
 */

import SideDrawer from '@/features/drawer/components/SideDrawer';

export default function GlobalSideDrawer() {
  return <SideDrawer />;
}
