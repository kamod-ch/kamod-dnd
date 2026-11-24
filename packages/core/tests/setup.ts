// Preact's effect scheduler assumes requestAnimationFrame and
// cancelAnimationFrame are available as a pair. Some jsdom environments only
// expose requestAnimationFrame, which can leave a delayed effect flush throwing
// after a test has completed.
if (typeof globalThis.requestAnimationFrame !== "function") {
  globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(performance.now()), 0);
}

if (typeof globalThis.cancelAnimationFrame !== "function") {
  globalThis.cancelAnimationFrame = (handle) => clearTimeout(handle);
}
