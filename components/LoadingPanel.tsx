'use client';

import React from 'react';
import Lottie from 'lottie-react';

interface LoadingPanelProps {
  message?: string;
  className?: string;
}

const LoadingPanel: React.FC<LoadingPanelProps> = ({ message, className = '' }) => {
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
    <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
      <Lottie
        animationData={animationData}
        loop={true}
        autoplay={true}
        style={{ width: 102, height: 102 }}
      />
      {message && (
        <p className="mt-4 px-4 text-sm text-center text-gray-600 max-w-md">{message}</p>
      )}
    </div>
  );
};

export default LoadingPanel;
