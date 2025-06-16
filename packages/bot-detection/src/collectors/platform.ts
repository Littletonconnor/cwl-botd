/**
 * Get user platform (currently a beta feature only supported by some browsers).
 * @link https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgentData
 */
export function getUserPlatform() {
  return navigator.userAgentData?.platform ?? navigator.platform
}
