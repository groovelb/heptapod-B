/** Explicit URL language is stable for crawlers and never depends on private browser storage. */
export function shareLocale(search = '') {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  const values = params.getAll('lang');
  return values.length === 1 && ['ko', 'en'].includes(values[0]) ? values[0] : null;
}

export function localizedShareUrl(value, locale) {
  const url = new URL(value);
  if (locale === 'ko' || locale === 'en') url.searchParams.set('lang', locale);
  return url.href;
}
