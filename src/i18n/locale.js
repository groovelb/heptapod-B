export const LOCALE_STORAGE_KEY = 'heptapod.locale';
export const LANGUAGE_MODES = Object.freeze(['system', 'ko', 'en']);
export const isLanguageMode = (value) => LANGUAGE_MODES.includes(value);

/** Browsers expose the OS/browser's preferred language through navigator. */
export function detectSystemLocale(navigatorValue = globalThis.navigator) {
  const language = navigatorValue?.languages?.[0] || navigatorValue?.language || 'en';
  return /^ko(?:[-_]|$)/i.test(language) ? 'ko' : 'en';
}

export function readLanguageMode(windowValue = globalThis.window) {
  try {
    const saved = windowValue?.localStorage?.getItem(LOCALE_STORAGE_KEY);
    return isLanguageMode(saved) ? saved : 'system';
  } catch { return 'system'; }
}

export function saveLanguageMode(mode, windowValue = globalThis.window) {
  if (!isLanguageMode(mode)) return;
  try {
    if (mode === 'system') windowValue?.localStorage?.removeItem(LOCALE_STORAGE_KEY);
    else windowValue?.localStorage?.setItem(LOCALE_STORAGE_KEY, mode);
  } catch { /* The current session can still change language when storage is blocked. */ }
}
