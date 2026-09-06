import { createContext, useContext } from 'react';
import { createTranslator } from './messages.js';

export const I18nContext = createContext({
  ...createTranslator('ko'), languageMode: 'system', setLanguageMode: () => {},
});

export const useI18n = () => useContext(I18nContext);
