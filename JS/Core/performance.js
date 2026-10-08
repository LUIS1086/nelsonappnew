/*
 * NelsonApp performance helpers.
 * Opt-in only: existing business logic is not modified automatically.
 */
(function (global) {
  'use strict';
  if (global.NelsonPerf) return;
  global.NelsonPerf = Object.freeze({
    idle(callback, timeout = 1000) {
      if (typeof callback !== 'function') return;
      if ('requestIdleCallback' in global) {
        return global.requestIdleCallback(callback, { timeout });
      }
      return global.setTimeout(callback, 0);
    },
    raf(callback) {
      if (typeof callback !== 'function') return;
      return global.requestAnimationFrame(callback);
    },
    afterPaint(callback) {
      if (typeof callback !== 'function') return;
      return global.requestAnimationFrame(() =>
        global.requestAnimationFrame(callback)
      );
    }
  });
})(window);
