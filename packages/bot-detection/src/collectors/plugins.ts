import { State } from '../types';
import { BotdError } from '../utils';

/**
 * Counts the number of browser plugins installed for headless browser detection.
 * 
 * Bot detection usage:
 * • Headless browsers typically have 0-2 plugins while normal browsers have 10-20+ plugins
 * • Automation environments often strip plugins entirely, creating a "too clean" browser signature
 * 
 * @returns The total number of plugins installed in the browser
 * @throws {BotdError} When navigator.plugins is undefined
 */
export function getPlugins() {
  if (navigator.plugins === undefined) {
    throw new BotdError(State.Undefined, 'navigator.plugins is undefined');
  }

  return navigator.plugins.length;
}
