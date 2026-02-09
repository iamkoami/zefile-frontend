export const runtime = "edge";

import NotFoundContent from "./NotFoundContent";

/**
 * Custom 404 Not Found Page (Server Component wrapper)
 *
 * Sets edge runtime for Cloudflare Pages compatibility.
 * All client logic is in NotFoundContent.
 */
export default function NotFound() {
  return <NotFoundContent />;
}
