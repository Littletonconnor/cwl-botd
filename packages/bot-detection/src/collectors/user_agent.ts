/**
 * Retrieves the browser's user agent string for bot detection analysis.
 * 
 * Bot detection usage:
 * • Headless browsers often contain identifiable strings like "HeadlessChrome" or "PhantomJS"
 * • Automation tools may have unusual or inconsistent user agent patterns compared to real browsers
 * 
 * @returns The complete user agent string identifying the browser and system
 */
export function getUserAgent() {
  return navigator.userAgent
}
