'use client';

import React from 'react';
import Lottie from 'lottie-react';

interface LoadingFullscreenProps {
  message?: string;
}

const LoadingFullscreen: React.FC<LoadingFullscreenProps> = ({ message }) => {
  // Use the local JSON file
  const [animationData, setAnimationData] = React.useState<object | null>(null);

  React.useEffect(() => {
    fetch('/lotties/zefile_logo.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => console.error('Failed to load animation:', error));
  }, []);

  if (!animationData) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      <Lottie
        animationData={animationData}
        loop={true}
        autoplay={true}
        style={{ width: 102, height: 102 }}
        speed={1.5}
      />
      {message && (
        <p className="mt-4 px-4 text-sm text-center text-gray-600 max-w-md">{message}</p>
      )}
    </div>
  );
};

export default LoadingFullscreen;
