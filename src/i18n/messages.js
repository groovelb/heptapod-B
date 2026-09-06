import ko from './locales/ko.js';
import en from './locales/en.js';

export const messages = Object.freeze({ ko, en });
const placeholder = /\{(\w+)\}/g;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

// Canonical domain/transport strings stay independent of the viewer's language.
// Remember parameterized messages for display without changing stored DTOs.
const formattedMessages = new Map();
function remember(value, key, params, authoredParams) {
  if (Object.values(params).some((part) => String(part) === value)) return value;
  if (formattedMessages.size >= 4096) formattedMessages.delete(formattedMessages.keys().next().value);
  formattedMessages.set(value, { key, params, authoredParams });
  return value;
}

export function formatMessage(template, params = {}) {
  return template.replace(placeholder, (token, name) => own(params, name) ? String(params[name] ?? '') : token);
}

export function translate(locale, key, params = {}, authoredParams = false) {
  if (locale === 'en' && Number(params.count ?? params.p0) === 1 && own(en, `${key}.one`)) key = `${key}.one`;
  const template = messages[locale]?.[key] ?? ko[key];
  if (template === undefined) throw new Error(`Unknown locale message: ${key}`);
  const value = formatMessage(template, params);
  return Object.keys(params).length ? remember(value, key, params, authoredParams) : value;
}

export const sourceText = (key, params) => translate('ko', key, params,
  /^(meaning|form|interpretGlyphMeaning|clusterArchiveGlyphs|groupArchiveMeanings|reversibleModel)\./.test(key));

const exactMessages = new Map();
for (const catalog of [en, ko]) {
  for (const [key, value] of Object.entries(catalog)) {
    if (value && !/\{\w+\}/.test(value)) exactMessages.set(value, key);
  }
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Compatibility with canonical observations returned by an API or a cached DTO.
// Only known full message templates match; this is never used on user names.
const patterns = Object.entries(ko).filter(([, value]) => /\{\w+\}/.test(value) && /[가-힣]/.test(value))
  .map(([key, value]) => {
    const names = [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
    const parts = value.split(/\{\w+\}/g);
    return { key, names, weight: parts.join('').length,
      pattern: new RegExp(`^${parts.map(escapeRegex).join('([\\s\\S]*?)')}$`) };
  }).sort((a, b) => b.weight - a.weight);

/** Localize authored labels/observations/errors, never names or editable input. */
export function localizeMessage(value, locale, depth = 0) {
  if (typeof value !== 'string' || !value || depth > 12) return value;
  const directKey = exactMessages.get(value);
  if (directKey) return translate(locale, directKey);
  const saved = formattedMessages.get(value);
  if (saved) {
    const params = saved.authoredParams ? Object.fromEntries(Object.entries(saved.params).map(([key, part]) =>
      [key, localizeMessage(part, locale, depth + 1)])) : saved.params;
    return translate(locale, saved.key, params, saved.authoredParams);
  }
  if (locale === 'ko') return value;
  for (const { key, names, pattern } of patterns) {
    const match = value.match(pattern);
    if (match) return translate(locale, key, Object.fromEntries(names.map((name, index) =>
      [name, localizeMessage(match[index + 1], locale, depth + 1)])));
  }
  // Meaning titles and morphology summaries are composed from authored labels.
  for (const separator of [' · ', ', ']) {
    if (value.includes(separator)) return value.split(separator).map((part) => localizeMessage(part, locale, depth + 1)).join(separator);
  }
  const trimmed = value.trim();
  if (trimmed !== value) return value.replace(trimmed, localizeMessage(trimmed, locale, depth + 1));
  return value;
}

export function createTranslator(locale) {
  return {
    locale,
    t: (key, params) => translate(locale, key, params),
    localize: (value) => localizeMessage(value, locale),
    formatNumber: (value, options) => new Intl.NumberFormat(locale, options).format(value),
    formatDate: (value, options) => new Intl.DateTimeFormat(locale, options).format(new Date(value)),
  };
}
