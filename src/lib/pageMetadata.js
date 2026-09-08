import { headers } from 'next/headers';
import { generatePageMetadata } from './og/index.js';

/** Request origin is a local/preview fallback; production can set a canonical SITE_URL. */
export async function pageMetadata(kind, props = {}) {
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') || 'localhost:3000';
  const protocol = /^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? 'http' : 'https';
  return generatePageMetadata({ kind, params: await props.params || {},
    searchParams: await props.searchParams || {}, origin: `${protocol}://${host}` });
}
