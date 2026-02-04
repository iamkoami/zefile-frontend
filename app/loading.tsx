import LoadingFullscreen from '@/components/LoadingFullscreen';

/**
 * Global Loading Component
 *
 * This shows while any page is loading during navigation.
 * Provides consistent UX across all routes by displaying
 * the ZeFile logo animation while content loads.
 */
export default function Loading() {
  return <LoadingFullscreen />;
}
