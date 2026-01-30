"use client";

import React from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import paperPlaneAnimation from "@/public/lotties/zefile-paper-plane-loading.json";

interface PaperPlaneAnimationProps {
  isVisible: boolean;
}

const PaperPlaneAnimation: React.FC<PaperPlaneAnimationProps> = ({
  isVisible,
}) => {
  const lottieRef = React.useRef<LottieRefCurrentProps>(null);

  React.useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(1);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="hidden lg:flex flex-col items-center justify-center pointer-events-none"
      style={{
        position: "absolute",
        right: "1rem",
        top: "60%",
        transform: "translateY(-50%)",
        transition: "opacity 300ms ease-in-out",
        zIndex: 1,
      }}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={paperPlaneAnimation}
        loop={true}
        autoplay={true}
        style={{
          width: "700px",
          height: "auto",
        }}
      />
    </div>
  );
};

export default PaperPlaneAnimation;
