"use client";

import Link from "next/link";

interface ProfileNotFoundProps {
  heading: string;
  description: string;
  backLabel: string;
}

export default function ProfileNotFound({
  heading,
  description,
  backLabel,
}: ProfileNotFoundProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#1a1a1a] px-6">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <span className="text-2xl text-gray-400 dark:text-gray-500">?</span>
        </div>
        <h1 className="text-2xl font-bold text-[#171717] dark:text-white mb-3">
          {heading}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">{description}</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium bg-[#87E64B] text-[#171717] rounded hover:bg-[#78d43f] transition-colors"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
