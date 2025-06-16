/**
 * Detects if the browser is being controlled by automation software (WebDriver).
 * 
 * Bot detection usage:
 * • Automation tools like Selenium, Puppeteer, and Playwright set this flag to `true` per WebDriver spec
 * • Normal user browsing returns `undefined` or `false`, making this a strong bot indicator
 * 
 * @returns The webdriver flag value (true for automated browsers, undefined/false for normal browsers)
 */
export function getWebDriver() {
  return navigator.webdriver
}
