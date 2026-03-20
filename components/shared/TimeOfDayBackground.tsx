"use client";

import React, { useState, useEffect } from "react";
import Lottie from "lottie-react";

interface TimeOfDayBackgroundProps {
  timeOfDay: "day" | "evening" | "night";
}

/**
 * TimeOfDayBackground - Displays ambient lottie animations based on time of day
 * - Day: Birds flying animation (white filter)
 * - Evening: Birds flying animation (original colors)
 * - Night: Stars twinkling animation (white filter)
 *
 * Positioned behind HeroText (z-index: 1, HeroText is z-index: 2)
 */
const TimeOfDayBackground: React.FC<TimeOfDayBackgroundProps> = ({
  timeOfDay,
}) => {
  const showBirds = timeOfDay === "day" || timeOfDay === "evening";
  const showStars = timeOfDay === "night";

  // Dynamic import for Lottie JSON files (F-4.1: reduce bundle size)
  const [birdsAnimation, setBirdsAnimation] = useState<object | null>(null);
  const [starsAnimation, setStarsAnimation] = useState<object | null>(null);

  useEffect(() => {
    import("@/public/lotties/birds.json").then((m) =>
      setBirdsAnimation(m.default),
    );
    import("@/public/lotties/stars.json").then((m) =>
      setStarsAnimation(m.default),
    );
  }, []);

  // White filter for day birds and night stars
  const whiteFilter = "brightness(0) invert(1)";

  return (
    <div
      className="hidden lg:block pointer-events-none select-none"
      style={{
        position: "absolute",
        right: "0rem",
        top: "-1rem",
        zIndex: 1,
        width: "700px",
        height: "500px",
      }}
    >
      {/* Birds animation - Day & Evening */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: showBirds ? 1 : 0,
          transition: "opacity 1.5s ease-in-out, filter 1.5s ease-in-out",
          filter: timeOfDay === "day" ? whiteFilter : "none",
        }}
      >
        {showBirds && birdsAnimation && (
          <Lottie
            animationData={birdsAnimation}
            loop={true}
            autoplay={true}
            className="ze-lottie-container"
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        )}
      </div>

      {/* Stars animation - Night */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: showStars ? 0.3 : 0,
          transition: "opacity 1.5s ease-in-out",
          filter: whiteFilter,
        }}
      >
        {showStars && starsAnimation && (
          <Lottie
            animationData={starsAnimation}
            loop={true}
            autoplay={true}
            className="ze-lottie-container"
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        )}
      </div>
    </div>
  );
};

export default TimeOfDayBackground;
