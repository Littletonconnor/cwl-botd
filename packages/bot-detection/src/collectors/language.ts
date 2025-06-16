/**
 * Retrieves the browser's primary language setting for consistency analysis.
 * 
 * Bot detection usage:
 * • Bots may have default "en-US" language settings that don't match user's location/timezone
 * • Automation environments often lack proper language configuration, showing inconsistent locale data
 * 
 * @returns The primary language code (e.g., "en-US", "fr-FR") set in the browser
 */
export function getLanguage() {
  return navigator.language
}
