const APPEARANCE_STORAGE_KEY = 'splitbill.appearance';
const appearanceModes = new Set(['system', 'light', 'dark']);

function canUseDom() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function getStoredAppearanceMode() {
  if (!canUseDom()) {
    return 'system';
  }

  const storedMode = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);

  return appearanceModes.has(storedMode) ? storedMode : 'system';
}

export function resolveAppearanceTheme(mode) {
  if (!canUseDom()) {
    return 'light';
  }

  if (mode === 'dark' || mode === 'light') {
    return mode;
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyAppearanceMode(mode) {
  if (!canUseDom()) {
    return 'light';
  }

  const safeMode = appearanceModes.has(mode) ? mode : 'system';
  const resolvedTheme = resolveAppearanceTheme(safeMode);

  document.documentElement.dataset.appearance = safeMode;
  document.documentElement.dataset.theme = resolvedTheme;

  return resolvedTheme;
}

export function persistAppearanceMode(mode) {
  if (!canUseDom()) {
    return 'light';
  }

  const safeMode = appearanceModes.has(mode) ? mode : 'system';
  window.localStorage.setItem(APPEARANCE_STORAGE_KEY, safeMode);

  return applyAppearanceMode(safeMode);
}

export function subscribeToSystemAppearance(onChange) {
  if (!canUseDom() || typeof window.matchMedia !== 'function') {
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => onChange();

  mediaQuery.addEventListener?.('change', handler);

  return () => {
    mediaQuery.removeEventListener?.('change', handler);
  };
}
