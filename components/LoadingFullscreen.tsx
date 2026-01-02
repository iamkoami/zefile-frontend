'use client';

import React from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import zefileLogoAnimation from '@/public/lotties/zefile_logo.json';

interface LoadingFullscreenProps {
  message?: string;
}

const LoadingFullscreen: React.FC<LoadingFullscreenProps> = ({ message }) => {
  const lottieRef = React.useRef<LottieRefCurrentProps>(null);

  React.useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(1.5);
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#FFFFFF' }}
    >
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

export default LoadingFullscreen;
