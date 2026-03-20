"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Lottie, { LottieRefCurrentProps } from "lottie-react";

interface LoadingFullscreenProps {
  message?: string;
}

const LoadingFullscreen: React.FC<LoadingFullscreenProps> = ({ message }) => {
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

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      {animationData ? (
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop={true}
          autoplay={true}
          className="ze-lottie-container"
          style={{ width: 160, height: 160 }}
        />
      ) : (
        <div className="animate-pulse">
          <Image src="/load.svg" alt="ZeFile" width={92} height={92} priority />
        </div>
      )}
      {message && (
        <p className="mt-4 px-4 text-sm text-center max-w-md text-gray-600">
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingFullscreen;
