import { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nContext } from './useI18n.js';
import { createTranslator } from './messages.js';
import { detectSystemLocale, isLanguageMode, LOCALE_STORAGE_KEY, readLanguageMode, saveLanguageMode } from './locale.js';

export default function LocaleProvider({ children, initialMode, urlLocale = null, syncDocument = true, syncMetadata = true }) {
  const [languageMode, setMode] = useState(() => urlLocale || (isLanguageMode(initialMode) ? initialMode : readLanguageMode()));
  const [lastUrlLocale, setLastUrlLocale] = useState(urlLocale);
  if (lastUrlLocale !== urlLocale) {
    setLastUrlLocale(urlLocale);
    if (urlLocale) setMode(urlLocale);
  }
  const [systemLocale, setSystemLocale] = useState(detectSystemLocale);
  const locale = languageMode === 'system' ? systemLocale : languageMode;
  const translator = useMemo(() => createTranslator(locale), [locale]);
  const setLanguageMode = useCallback((mode) => {
    if (!isLanguageMode(mode)) return;
    saveLanguageMode(mode);
    setSystemLocale(detectSystemLocale());
    setMode(mode);
  }, []);

  useEffect(() => {
    const languageChange = () => setSystemLocale(detectSystemLocale());
    const storageChange = (event) => {
      if (event.key === LOCALE_STORAGE_KEY || event.key === null) setMode(readLanguageMode());
    };
    window.addEventListener('languagechange', languageChange);
    window.addEventListener('storage', storageChange);
    return () => {
      window.removeEventListener('languagechange', languageChange);
      window.removeEventListener('storage', storageChange);
    };
  }, []);

  useEffect(() => {
    if (!syncDocument) return;
    document.documentElement.lang = locale;
    // Next pages own route-specific titles/OG; language controls still update the UI.
    if (!syncMetadata) return;
    document.title = translator.t('app.title');
    for (const [selector, key] of [
      ['meta[name="description"]', 'app.description'],
      ['meta[property="og:title"]', 'app.title'],
      ['meta[property="og:description"]', 'app.ogDescription'],
    ]) document.querySelector(selector)?.setAttribute('content', translator.t(key));
  }, [locale, translator, syncDocument, syncMetadata]);

  const value = useMemo(() => ({ ...translator, languageMode, setLanguageMode }), [translator, languageMode, setLanguageMode]);
  return <I18nContext.Provider value={ value }>{ children }</I18nContext.Provider>;
}
