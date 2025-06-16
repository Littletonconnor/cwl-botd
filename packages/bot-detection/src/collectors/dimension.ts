/**
 * Retrieves the current window dimensions for headless browser detection.
 * 
 * Bot detection usage:
 * • Headless browsers often have unusual or default dimensions like 800x600, 1024x768, or 0x0
 * • Automation tools may not properly simulate realistic user viewport sizes or browser window states
 * 
 * @returns Object containing current window width and height in pixels
 */
export function getDimension() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}
