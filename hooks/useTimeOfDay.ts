import { useState, useEffect } from "react";

export type TimeOfDay = "day" | "evening" | "night";

/**
 * Determines the time of day based on hour
 * Day: 6:00 AM - 2:00 PM (6-13)
 * Evening: 2:00 PM - 7:00 PM (14-18)
 * Night: 7:00 PM - 6:00 AM (19-5)
 *
 * Colors are defined in globals.css via .ze-time-day, .ze-time-evening, .ze-time-night
 */
function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 14) {
    return "day";
  } else if (hour >= 14 && hour < 19) {
    return "evening";
  } else {
    return "night";
  }
}

/**
 * Hook that provides time-of-day value
 * Updates every minute to catch time changes
 *
 * Returns "day" during SSR and first render to avoid hydration mismatch,
 * then updates to the real time of day on the client.
 */
export function useTimeOfDay(): { timeOfDay: TimeOfDay; isHydrated: boolean } {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("day");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    setTimeOfDay(getTimeOfDay(hour));
    setIsHydrated(true);

    const interval = setInterval(() => {
      const h = new Date().getHours();
      setTimeOfDay(getTimeOfDay(h));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return { timeOfDay, isHydrated };
}

export default useTimeOfDay;
