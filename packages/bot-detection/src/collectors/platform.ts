/**
 * Retrieves the user's operating system platform for consistency validation.
 *
 * Bot detection usage:
 * • Automation environments may report inconsistent platform data compared to other system indicators
 * • Headless browsers might return generic platform values that don't match expected user patterns
 *
 * @returns The platform string (e.g., "Win32", "MacIntel", "Linux x86_64") with fallback support
 */
export function getUserPlatform() {
  return navigator.userAgentData?.platform ?? navigator.platform;
}
