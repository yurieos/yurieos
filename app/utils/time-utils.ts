// Helper functions for time conversion and formatting

// Regex for validating "HH:mm" time format (24-hour)
const TIME_24H_REGEX = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;

export const convertTo12Hour = (hour24: number): number => {
  if (hour24 === 0) {
    return 12;
  }
  if (hour24 > 12) {
    return hour24 - 12;
  }
  return hour24;
};

export const convertTo24Hour = (hour12: number, ampm: string): number => {
  if (ampm === "AM") {
    return hour12 === 12 ? 0 : hour12;
  }
  return hour12 === 12 ? 12 : hour12 + 12;
};

// Return type interface for formatTime12Hour function
type Time12HourFormat = {
  hour12: string;
  minute: string;
  ampm: "AM" | "PM";
};

export const formatTime12Hour = (time24: string): Time12HourFormat => {
  // Validate input format using regex - expects "HH:mm" format
  if (!TIME_24H_REGEX.test(time24)) {
    throw new Error(
      `Invalid time format. Expected "HH:mm" format, received: "${time24}"`
    );
  }

  const [hour, minute] = time24.split(":");
  const hour24 = Number.parseInt(hour, 10);

  // Additional validation for hour range (0-23)
  if (hour24 < 0 || hour24 > 23) {
    throw new Error(`Invalid hour value. Expected 0-23, received: ${hour24}`);
  }

  // Additional validation for minute range (0-59)
  const minuteValue = Number.parseInt(minute, 10);
  if (minuteValue < 0 || minuteValue > 59) {
    throw new Error(
      `Invalid minute value. Expected 0-59, received: ${minuteValue}`
    );
  }

  const hour12 = convertTo12Hour(hour24);
  const ampm: "AM" | "PM" = hour24 < 12 ? "AM" : "PM";

  return {
    hour12: hour12.toString(),
    minute,
    ampm,
  };
};

export const isTimeInPast = (time: string, selectedDate?: Date): boolean => {
  if (!selectedDate) {
    return false;
  }

  const [hours, minutes] = time.split(":").map(Number);
  const targetDateTime = new Date(selectedDate);
  targetDateTime.setHours(hours, minutes, 0, 0);

  return targetDateTime < new Date();
};

export const getNextAvailableTime = (): string => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Find the next 5-minute interval (always in the future)
  // Add 1 minute first to ensure we get the NEXT interval, then round up
  const nextMinuteTarget = currentMinute + 1;
  const roundedMinute = Math.ceil(nextMinuteTarget / 5) * 5;

  let nextHour = currentHour;
  let nextMinute = roundedMinute;

  // If rounded minute is 60 or more, move to next hour
  if (nextMinute >= 60) {
    nextHour += 1;
    nextMinute = 0;
  }

  // If we've gone past 23:59, it means next available time is tomorrow at 00:00
  if (nextHour >= 24) {
    nextHour = 0;
    nextMinute = 0;
  }

  return `${nextHour.toString().padStart(2, "0")}:${nextMinute.toString().padStart(2, "0")}`;
};

export const getNextAvailableDate = (): Date => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Calculate if the next available time would be tomorrow
  // Use same logic as getNextAvailableTime
  const nextMinuteTarget = currentMinute + 1;
  const roundedMinute = Math.ceil(nextMinuteTarget / 5) * 5;
  const nextHour = roundedMinute >= 60 ? currentHour + 1 : currentHour;

  // If next available time would be tomorrow (past 23:59), default to tomorrow
  if (nextHour >= 24) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  return now;
};
