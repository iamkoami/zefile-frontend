import { useState, useEffect } from 'react';

export type TimeOfDay = 'day' | 'evening' | 'night';

interface TimeTheme {
  timeOfDay: TimeOfDay;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

const THEMES: Record<TimeOfDay, Omit<TimeTheme, 'timeOfDay'>> = {
  day: {
    backgroundColor: '#93E5F7',
    textColor: '#171717',
    accentColor: '#5E53E0',
  },
  evening: {
    backgroundColor: '#F9F4F0',
    textColor: '#171717',
    accentColor: '#5E53E0',
  },
  night: {
    backgroundColor: '#13121D',
    textColor: '#FFFFFF',
    accentColor: '#87E64B',
  },
};

/**
 * Determines the time of day based on hour
 * Day: 6:00 AM - 2:00 PM (6-13)
 * Evening: 2:00 PM - 7:00 PM (14-18)
 * Night: 7:00 PM - 6:00 AM (19-5)
 */
function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 14) {
    return 'day';
  } else if (hour >= 14 && hour < 19) {
    return 'evening';
  } else {
    return 'night';
  }
}

/**
 * Hook that provides time-of-day theming
 * Updates every minute to catch time changes
 */
export function useTimeOfDay(): TimeTheme {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => {
    const hour = new Date().getHours();
    return getTimeOfDay(hour);
  });

  useEffect(() => {
    // Update immediately
    const updateTimeOfDay = () => {
      const hour = new Date().getHours();
      const newTimeOfDay = getTimeOfDay(hour);
      setTimeOfDay(newTimeOfDay);
    };

    // Check every minute for time changes
    const interval = setInterval(updateTimeOfDay, 60000);

    return () => clearInterval(interval);
  }, []);

  return {
    timeOfDay,
    ...THEMES[timeOfDay],
  };
}

/**
 * Get CSS custom properties for current time theme
 */
export function getTimeThemeStyles(timeOfDay: TimeOfDay): React.CSSProperties {
  const theme = THEMES[timeOfDay];
  return {
    '--time-bg': theme.backgroundColor,
    '--time-text': theme.textColor,
    '--time-accent': theme.accentColor,
  } as React.CSSProperties;
}

export default useTimeOfDay;
