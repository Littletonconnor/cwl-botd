import { getWebGl } from './canvas';
import { getClickBehavior } from './click_behavior';
import { getDimension } from './dimension';
import { getDocumentFocus } from './document_focus';
import { getLanguage } from './language';
import { getMouseBehavior } from './mouse_behavior';
import { getUserPlatform } from './platform';
import { getPlugins } from './plugins';
import { getScrollBehavior } from './scroll_behavior';
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
  documentFocus: getDocumentFocus,
  scrollBehavior: getScrollBehavior,
  mouseBehavior: getMouseBehavior,
  clickBehavior: getClickBehavior,
  dimension: getDimension,
  plugins: getPlugins,
};
