// Lightweight onboarding helpers using localStorage.
// Does not touch UI by itself; expose flags/styles for opt-in screens.

const STORAGE_KEY = 'meowdoku.onboarding.seen';

export function hasSeenOnboarding(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function markOnboardingSeen(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, 'true');
}

export function resetOnboarding(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
