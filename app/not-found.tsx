export const runtime = "edge";

import Link from "next/link";

/**
 * Custom 404 Not Found Page
 *
 * Static server component for Cloudflare Pages edge runtime compatibility.
 * Short link redirects (/z-{code}, /downloads/{code}) are handled in middleware.
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-white">
      {/* 404 Text */}
      <h1 className="text-9xl font-bold text-[#5E53E0] mb-4">404</h1>

      {/* Title */}
      <h2 className="text-2xl font-bold text-[#171717] mb-3 text-center">
        Page Not Found
      </h2>

      {/* Subtitle */}
      <p className="text-gray-500 mb-8 text-center max-w-md leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      {/* Primary CTA */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors"
      >
        Start Transfer
      </Link>

      {/* Secondary link */}
      <div className="mt-4">
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-[#5E53E0] transition-colors"
        >
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}
