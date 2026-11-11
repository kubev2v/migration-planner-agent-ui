/**
 * Parses a Go duration string (e.g., "989h19m27.587096774s") and returns
 * the total number of seconds.
 */
export const parseDuration = (duration: string): number => {
  const trimmed = duration.trim();
  const isNegative = trimmed.startsWith("-");
  const unsigned = isNegative ? trimmed.slice(1) : trimmed;

  let totalSeconds = 0;

  const regex = /(\d+(?:\.\d+)?)(ns|us|µs|μs|ms|s|m|h)/g;
  let match = regex.exec(unsigned);

  while (match !== null) {
    const value = parseFloat(match[1]);
    const unit = match[2];

    switch (unit) {
      case "h":
        totalSeconds += value * 3600;
        break;
      case "m":
        totalSeconds += value * 60;
        break;
      case "s":
        totalSeconds += value;
        break;
      case "ms":
        totalSeconds += value * 1e-3;
        break;
      case "us":
      case "µs":
      case "μs":
        totalSeconds += value * 1e-6;
        break;
      case "ns":
        totalSeconds += value * 1e-9;
        break;
    }

    match = regex.exec(unsigned);
  }

  return isNegative ? -totalSeconds : totalSeconds;
};

/**
 * Formats a duration string (e.g., "989h19m27.587096774s") into a
 * human-readable format like "41 days 5 hours 19 minutes".
 */
export const formatDuration = (duration: string): string => {
  const totalSeconds = parseDuration(duration);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  }
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  }

  return parts.join(" ");
};

/**
 * Converts a Go duration string to a whole number of hours (rounded up).
 */
export const durationToHours = (duration: string): number =>
  Math.ceil(parseDuration(duration) / 3600);

/**
 * Formats a number of hours into the most appropriate human-readable unit
 * (months, days, or hours).
 */
export const formatHumanDuration = (hours: number): string => {
  if (hours >= 730) {
    const months = hours / 730;
    const label = months === 1 ? "month" : "months";
    return months % 1 === 0
      ? `${months} ${label}`
      : `${months.toFixed(1)} ${label}`;
  }
  if (hours >= 24) {
    const days = Math.ceil(hours / 24);
    return `${days} ${days === 1 ? "day" : "days"}`;
  }
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
};
