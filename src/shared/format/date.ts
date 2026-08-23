export const formatDate = (
  timestamp: number,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
) => {
  try {
    return new Intl.DateTimeFormat("en", {
      ...options,
      timeZone: timeZone === "browser" ? undefined : timeZone,
    }).format(timestamp);
  } catch {
    return new Intl.DateTimeFormat("en", options).format(timestamp);
  }
};
