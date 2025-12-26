'use client';

import React, { useState } from 'react';
import Header from '@/features/home/components/Header';
import UploadPanel from '@/features/home/components/UploadPanel';
import TransferOptionsPanel from '@/features/home/components/TransferOptionsPanel';

export default function Home() {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div
          className="rounded-2xl p-8 sm:p-12"
          style={{ backgroundColor: '#ECF0F4' }}
        >
          <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
            {/* Upload Panel */}
            <UploadPanel onShowOptions={() => setShowOptions(!showOptions)} />

            {/* Transfer Options Panel */}
            <TransferOptionsPanel isVisible={showOptions} />
          </div>
        </div>
      </main>
    </div>
  );
}
