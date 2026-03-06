"use client";

import { useReportWebVitals } from "next/web-vitals";
import { trackEvent } from "@/lib/posthog";

export default function WebVitals() {
  useReportWebVitals((metric) => {
    trackEvent("zefile_web_vital", {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigation_type: metric.navigationType,
    });
  });

  return null;
}
