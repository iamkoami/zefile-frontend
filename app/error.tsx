'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Une erreur s&apos;est produite
        </h2>
        <p className="text-gray-600 mb-6">
          Nous sommes desoles, quelque chose s&apos;est mal passe.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-[#87E64B] text-black font-semibold rounded-lg hover:bg-[#75D43A] transition-colors"
        >
          Reessayer
        </button>
      </div>
    </div>
  );
}
