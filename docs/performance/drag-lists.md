# Drag list performance (informative)

Chromium (Playwright bundled), Linux, viewport default, measured 2026-11-15T14:29:23.114Z.

Method: [`examples/perf-list`](../examples/perf-list) with `?count=N`, simulated pointer drag (~30 moves). Row render counter in each list row; `PerformanceObserver` (`longtask`) where supported.

Not a FPS guarantee. Touch/real devices not covered.

| Items | Row renders during drag | Long tasks | Max long task (ms) |
| ----- | ----------------------- | ---------- | ------------------ |
| 100   | 2                       | 0          | 0.0                |
| 500   | 2                       | 0          | 0.0                |
