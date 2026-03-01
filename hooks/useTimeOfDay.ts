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
 */
export function useTimeOfDay(): { timeOfDay: TimeOfDay } {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("day");

  useEffect(() => {
    const updateTimeOfDay = () => {
      const hour = new Date().getHours();
      setTimeOfDay(getTimeOfDay(hour));
    };

    updateTimeOfDay();
    const interval = setInterval(updateTimeOfDay, 60000);

    return () => clearInterval(interval);
  }, []);

  return { timeOfDay };
}

export default useTimeOfDay;
