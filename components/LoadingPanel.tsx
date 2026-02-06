'use client';

import React, { useState, useEffect } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';

interface LoadingPanelProps {
  message?: string;
  className?: string;
  /** When true, fills available vertical space for proper centering in containers like drawers */
  fullHeight?: boolean;
}

const LoadingPanel: React.FC<LoadingPanelProps> = ({ message, className = '', fullHeight = false }) => {
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

  const heightClass = fullHeight ? 'h-full min-h-[60vh]' : 'py-8';

  return (
    <div className={`flex flex-col items-center justify-center ${heightClass} ${className}`}>
      {animationData && (
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop={true}
          autoplay={true}
          style={{ width: 102, height: 102 }}
        />
      )}
    </div>
  );
};

export default LoadingPanel;
