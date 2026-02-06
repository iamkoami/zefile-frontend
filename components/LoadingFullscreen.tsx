'use client';

import React, { useState, useEffect } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';

interface LoadingFullscreenProps {
  message?: string;
}

const LoadingFullscreen: React.FC<LoadingFullscreenProps> = ({ message }) => {
  const lottieRef = React.useRef<LottieRefCurrentProps>(null);
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    import('@/public/lotties/zefile_logo.json').then((m) => setAnimationData(m.default));
  }, []);

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
      {animationData && (
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop={true}
          autoplay={true}
          style={{ width: 102, height: 102 }}
        />
      )}
      {message && (
        <p className="mt-4 px-4 text-sm text-center text-gray-600 max-w-md">{message}</p>
      )}
    </div>
  );
};

export default LoadingFullscreen;
