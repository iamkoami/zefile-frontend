"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Lottie, { LottieRefCurrentProps } from "lottie-react";

interface LoadingPanelProps {
  message?: string;
  className?: string;
  /** When true, fills available vertical space for proper centering in containers like drawers */
  fullHeight?: boolean;
}

const LoadingPanel: React.FC<LoadingPanelProps> = ({
  message: _message,
  className = "",
  fullHeight = false,
}) => {
  const lottieRef = React.useRef<LottieRefCurrentProps>(null);
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    import("@/public/lotties/zefile_logo.json").then((m) =>
      setAnimationData(m.default),
    );
  }, []);

  useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(1.5);
    }
  }, [animationData]);

  const heightClass = fullHeight ? "h-full min-h-[60vh]" : "py-8";

  return (
    <div
      className={`flex flex-col items-center justify-center ${heightClass} ${className}`}
    >
      {animationData ? (
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop={true}
          autoplay={true}
          style={{ width: 102, height: 102 }}
        />
      ) : (
        <div className="animate-pulse">
          <Image src="/load.svg" alt="ZeFile" width={50} height={50} priority />
        </div>
      )}
    </div>
  );
};

export default LoadingPanel;
