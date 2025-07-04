/**
 * Retrieves the user's timezone and locale data for geographical consistency validation.
 *
 * Bot detection usage:
 * • Headless browsers often default to UTC timezone regardless of intended location
 * • Bot farms may have mismatched timezone/locale combinations (e.g., UTC + zh-CN)
 * • Automation tools frequently fail to properly spoof timezone data consistently
 * • Real users typically have geographically consistent timezone/locale pairs
 *
 * @returns Object containing timezone (IANA identifier) and locale (language code)
 * @example { timezone: "America/Los_Angeles", locale: "en-US" }
 */
export function getTimezone() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const locale = navigator.language;

  return { timezone, locale };
}
