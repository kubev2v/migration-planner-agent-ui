export type Duration = number;

export enum Time {
  Millisecond = 1,
  Second = 1000 * Millisecond,
  Minute = 60 * Second,
  Hour = 60 * Minute,
  Day = 24 * Hour,
  Week = 7 * Day,
}

export const sleep = (delayMs: Duration): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
