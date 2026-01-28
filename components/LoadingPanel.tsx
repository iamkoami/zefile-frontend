'use client';

import React from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import zefileLogoAnimation from '@/public/lotties/zefile_logo.json';

interface LoadingPanelProps {
  message?: string;
  className?: string;
  /** When true, fills available vertical space for proper centering in containers like drawers */
  fullHeight?: boolean;
}

const LoadingPanel: React.FC<LoadingPanelProps> = ({ message, className = '', fullHeight = false }) => {
  const lottieRef = React.useRef<LottieRefCurrentProps>(null);

  React.useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(1.5);
    }
  }, []);

  const heightClass = fullHeight ? 'h-full min-h-[60vh]' : 'py-8';

  return (
    <div className={`flex flex-col items-center justify-center ${heightClass} ${className}`}>
      <Lottie
        lottieRef={lottieRef}
        animationData={zefileLogoAnimation}
        loop={true}
        autoplay={true}
        style={{ width: 102, height: 102 }}
      />
    </div>
  );
};

export default LoadingPanel;
