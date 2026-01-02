'use client';

import React from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import zefileLogoAnimation from '@/public/lotties/zefile_logo.json';

interface LoadingPanelProps {
  message?: string;
  className?: string;
}

const LoadingPanel: React.FC<LoadingPanelProps> = ({ message, className = '' }) => {
  const lottieRef = React.useRef<LottieRefCurrentProps>(null);

  React.useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(1.5);
    }
  }, []);

  return (
    <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
      <Lottie
        lottieRef={lottieRef}
        animationData={zefileLogoAnimation}
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
