import { getWebGl } from './canvas';
import { getDimension } from './dimension';
import { getLanguage } from './language';
import { getUserPlatform } from './platform';
import { getPlugins } from './plugins';
import { getTimezone } from './timezone';
import { getUserAgent } from './user_agent';
import { getWebDriver } from './webdriver';

export const collectors = {
  userAgent: getUserAgent,
  platform: getUserPlatform,
  language: getLanguage,
  timezone: getTimezone,
  webDriver: getWebDriver,
  webGl: getWebGl,
  dimension: getDimension,
  plugins: getPlugins,
};
