const collectedOnOptions: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
};

const groupLastUpdatedOptions: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
};

/** Report header format, for example "8/17/2026, 10:30:00 AM". */
export function formatDataCollectedOn(
  date: Date,
  locales?: Intl.LocalesArgument,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat(locales, {
    ...collectedOnOptions,
    timeZone,
  }).format(date);
}

/** Groups table format, for example "September 16, 2026 at 11:55 AM EDT". */
export function formatGroupLastUpdated(
  date: Date,
  locales?: Intl.LocalesArgument,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat(locales, {
    ...groupLastUpdatedOptions,
    timeZone,
  }).format(date);
}
