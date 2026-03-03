"use client";

import React, { useState, useEffect } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";

interface PaperPlaneAnimationProps {
  isVisible: boolean;
}

const PaperPlaneAnimation: React.FC<PaperPlaneAnimationProps> = ({
  isVisible,
}) => {
  const lottieRef = React.useRef<LottieRefCurrentProps>(null);
  const [logoAnimation, setLogoAnimation] = useState<object | null>(null);

  useEffect(() => {
    import("@/public/lotties/zefile_logo.json").then((m) =>
      setLogoAnimation(m.default),
    );
  }, []);

  React.useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(1);
    }
  }, []);

  if (!isVisible || !logoAnimation) return null;

  return (
    <div
      className="hidden lg:flex items-center justify-center pointer-events-none"
      style={{
        position: "absolute",
        right: "-25rem",
        top: "34%",
        transform: "translateY(-50%) rotate(19deg)",
        transition: "opacity 300ms ease-in-out",
        zIndex: 1,
        opacity: 0.2,
      }}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={logoAnimation}
        loop={true}
        autoplay={true}
        style={{
          width: "1400px",
          height: "auto",
        }}
      />
    </div>
  );
};

export default PaperPlaneAnimation;
