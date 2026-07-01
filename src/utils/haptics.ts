// Thin wrapper around the Web Vibration API with graceful fallback
// (no-ops silently on browsers/devices that don't support it, e.g. iOS Safari).

const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

function vibrate(pattern: number | number[]) {
  if (!canVibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore - vibration is a nice-to-have, never worth crashing over
  }
}

const haptics = {
  place: () => vibrate(15),
  wrong: () => vibrate([40, 60, 40]),
  win: () => vibrate([20, 40, 20, 40, 80]),
};

export default haptics;
