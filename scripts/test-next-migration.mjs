/** HTTP-only Next migration smoke checks. No browser, JavaScript execution, or remote writes.
 * Start `npm run dev` or `npm run start` first, then:
 * NEXT_TEST_ORIGIN=http://localhost:3000 node scripts/test-next-migration.mjs
 * Optional fixture server: NEXT_TEST_PUBLIC_GLYPH_ID and NEXT_TEST_CLUSTER_QUERY.
 * Stored geometry/withdrawal tests live separately in test-next-og.mjs.
 */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';

const origin = new URL(process.env.NEXT_TEST_ORIGIN || 'http://localhost:3000');
const dom = new Window({ settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true,
  disableJavaScriptEvaluation: true } });
let checks = 0;
const visitedImages = new Set();
const passed = (name) => { checks++; console.log(`PASS ${name}`); };
const request = (url, options = {}) => fetch(new URL(url, origin), {
  signal: AbortSignal.timeout(60_000), headers: { 'user-agent': 'Twitterbot/1.0' }, ...options,
});
const parse = (html) => new dom.DOMParser().parseFromString(html, 'text/html');
const meta = (doc, key) => doc.querySelector(`meta[property="${key}"],meta[name="${key}"]`)?.getAttribute('content');

async function imageFor(doc, label) {
  const value = meta(doc, 'og:image');
  assert.ok(value, `${label}: server HTML contains og:image`);
  const published = new URL(value);
  assert.ok(['http:', 'https:'].includes(published.protocol), `${label}: absolute HTTP image URL`);
  // Exercise this local build even when its canonical site URL is the production domain.
  const path = `${published.pathname}${published.search}`;
  if (visitedImages.has(path)) return;
  visitedImages.add(path);
  const response = await request(path);
  assert.equal(response.status, 200, `${label}: OG image status`);
  assert.match(response.headers.get('content-type') || '', /^image\/png\b/);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.ok(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Actual PNG bytes');
  assert.equal(bytes.readUInt32BE(16), 1200, 'OG width');
  assert.equal(bytes.readUInt32BE(20), 630, 'OG height');
  passed(`${label}: OG PNG 1200×630`);
}

async function page(path) {
  const response = await request(path);
  assert.equal(response.status, 200, `${path}: HTML status`);
  assert.match(response.headers.get('content-type') || '', /text\/html/);
  const doc = parse(await response.text());
  assert.ok(doc.querySelector('title')?.textContent.trim(), `${path}: title`);
  assert.ok(meta(doc, 'description'), `${path}: description`);
  assert.ok(meta(doc, 'og:title'), `${path}: OG title without running JavaScript`);
  assert.ok(doc.querySelector('link[rel="canonical"]')?.getAttribute('href'), `${path}: canonical`);
  assert.ok(doc.querySelector('#root'), `${path}: preserved root layout container`);
  await imageFor(doc, path);
  passed(`${path}: server metadata and application shell`);
  return doc;
}

async function redirect(path, expectedPath, expectedQuery = {}) {
  const response = await request(path, { redirect: 'manual' });
  assert.ok([301, 302, 303, 307, 308].includes(response.status), `${path}: HTTP redirect`);
  const target = new URL(response.headers.get('location'), origin);
  assert.equal(target.pathname, expectedPath);
  for (const [key, value] of Object.entries(expectedQuery)) assert.equal(target.searchParams.get(key), value);
  passed(`${path}: legacy destination preserved`);
}

try {
  const landing = await page('/');
  await page('/canvas');
  await page('/archive');
  await redirect('/me', '/archive');
  await redirect('/?name=Louise&v=1', '/canvas', { name: 'Louise', v: '1' });
  await redirect('/?name=Louise&v=2', '/canvas', { name: 'Louise', v: '2' });
  await redirect('/?create=1', '/canvas');
  assert.equal((await request('/__next_migration_missing_route__')).status, 404, 'Unknown route is 404');
  passed('unknown route: HTTP 404');

  const asset = await request('/heptapod-b-encoder/hero-pilot/hero-logogram-response-plate-fb1-v1.png');
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('content-type') || '', /^image\/png/);
  await asset.body?.cancel();
  passed('existing public hero asset remains available');

  const styles = [...landing.querySelectorAll('link[rel="stylesheet"]')].map((el) => el.getAttribute('href'));
  const google = styles.find((href) => href?.startsWith('https://fonts.googleapis.com/'));
  assert.ok(google, 'Original Google Fonts stylesheet remains in server HTML');
  const families = new URL(google).searchParams.getAll('family').join('|');
  for (const font of ['Cinzel', 'Fraunces', 'Newsreader', 'Noto Serif KR', 'Noto Serif SC']) {
    assert.ok(families.includes(font), `Preserved font family: ${font}`);
  }
  const localStyles = styles.filter((href) => href?.startsWith('/'));
  assert.ok(localStyles.length, 'Built application stylesheet exists');
  let fontCount = 0;
  for (const href of localStyles) {
    const response = await request(href);
    assert.equal(response.status, 200, `Stylesheet ${href}`);
    const css = await response.text();
    const fontUrls = [...css.matchAll(/url\(["']?([^\s)"']+\.woff2?(?:\?[^\s)"']*)?)["']?\)/g)];
    for (const [, url] of fontUrls) {
      const target = new URL(url, new URL(href, origin));
      if (target.origin !== origin.origin) continue;
      const font = await request(target);
      assert.equal(font.status, 200, `Font ${target.pathname}`);
      await font.body?.cancel();
      fontCount++;
    }
  }
  passed(`stylesheets, original font declarations, and ${fontCount} local font assets`);

  if (process.env.NEXT_TEST_PUBLIC_GLYPH_ID) await page(`/glyph/${encodeURIComponent(process.env.NEXT_TEST_PUBLIC_GLYPH_ID)}`);
  if (process.env.NEXT_TEST_CLUSTER_QUERY) await page(`/archive?${process.env.NEXT_TEST_CLUSTER_QUERY.replace(/^\?/, '')}`);
  console.log(`\n${checks} HTTP migration checks passed. No browser was used.`);
} finally {
  await dom.happyDOM.abort();
}
