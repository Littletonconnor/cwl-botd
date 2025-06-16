import { State } from '../types';
import { BotdError } from '../utils';

/**
 * Extracts WebGL graphics hardware information for bot detection fingerprinting.
 *
 * Bot detection usage:
 * • Headless browsers often lack proper WebGL/GPU support, returning null or generic vendor/renderer info
 * • Virtual environments and automation tools may have different graphics virtualization signatures
 *
 * @returns Object containing WebGL vendor and renderer strings for hardware fingerprinting
 * @throws {BotdError} When WebGL context is unavailable or functions are missing
 */
export function getWebGl() {
  const canvasElement = document.createElement('canvas');

  if (typeof canvasElement.getContext !== 'function') {
    throw new BotdError(State.NotFunction, 'HTMLCanvasElement.getContext is not a function');
  }

  const webGLContext = canvasElement.getContext('webgl');

  if (webGLContext === null) {
    throw new BotdError(State.Null, 'WebGLRenderingContext is null');
  }

  if (typeof webGLContext.getParameter !== 'function') {
    throw new BotdError(State.NotFunction, 'WebGLRenderingContext.getParameter is not a function');
  }

  const vendor = webGLContext.getParameter(webGLContext.VENDOR);
  const renderer = webGLContext.getParameter(webGLContext.RENDERER);

  return { vendor: vendor, renderer: renderer };
}
