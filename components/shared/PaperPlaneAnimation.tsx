"use client";

import React, { useState, useEffect } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";

type TimeOfDay = "day" | "evening" | "night";

interface PaperPlaneAnimationProps {
  isVisible: boolean;
  timeOfDay?: TimeOfDay;
}

// CSS filters to colorize the Lottie animation per time of day
const colorFilters: Record<TimeOfDay, string> = {
  day: "brightness(0) invert(1)", // #FFFFFF
  evening:
    "brightness(0) saturate(100%) invert(80%) sepia(50%) saturate(600%) hue-rotate(60deg) brightness(95%) contrast(87%)", // #87E64B
  night:
    "brightness(0) invert(1) sepia(4%) saturate(400%) hue-rotate(326deg)", // #FFF5ED
};

const PaperPlaneAnimation: React.FC<PaperPlaneAnimationProps> = ({
  isVisible,
  timeOfDay = "evening",
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
        animation: "revealPlane 1s ease-out 0.5s both",
        transition: "filter 1.5s ease-in-out",
        zIndex: 1,
        filter: colorFilters[timeOfDay],
      }}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={logoAnimation}
        loop={true}
        autoplay={true}
        className="ze-lottie-container"
        style={{
          width: "1400px",
          height: "auto",
        }}
      />
    </div>
  );
};

export default PaperPlaneAnimation;
