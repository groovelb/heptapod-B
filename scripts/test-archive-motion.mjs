/** Non-browser regression checks. Effects run with JS stubs, never a DOM/browser. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { APP_PATHS, legacyCanvasLocation } from '../src/routes/paths.js';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const gallery = readFileSync(new URL('../src/components/data-display/ArchiveGlyph.jsx', import.meta.url), 'utf8');
const archive = readFileSync(new URL('../src/components/templates/MyArchivePage.jsx', import.meta.url), 'utf8');
const depth = readFileSync(new URL('../src/components/data-display/ArchiveDepthExplorer.jsx', import.meta.url), 'utf8');
const feed = readFileSync(new URL('../src/components/data-display/ArchiveArchetypeFeed.jsx', import.meta.url), 'utf8');
const renderer = readFileSync(new URL('../src/components/motion/LogogramRendererCanvas.jsx', import.meta.url), 'utf8');
const effect = app.match(/useEffect\(\(\) => \{([\s\S]*?)\n  \}, \[pathname\]\);/)?.[1];

function mount(pathname, reduced = false, coarse = false) {
  assert.ok(effect, 'route-dependent Lenis lifecycle must remain in App');
  const instances = []; const frames = new Map(); const cancelled = []; const positions = [];
  let frameId = 0; let state;
  class LenisStub {
    constructor(options) { this.options = options; this.stopped = false; instances.push(this); }
    raf(time) { this.lastFrame = time; }
    scrollTo(position, options) { this.scroll = { position, ...options }; }
    stop() { this.stopped = true; }
    destroy() { this.destroyed = true; }
  }
  const cleanup = runInNewContext(`(() => {${effect}\n})()`, {
    pathname, APP_PATHS, isLanding: pathname === '/', Lenis: LenisStub,
    window: { matchMedia: (query) => ({ matches: query.includes('pointer') ? coarse : reduced }), scrollTo: (...position) => positions.push(position) },
    setLenis: (value) => { state = value; },
    requestAnimationFrame: (callback) => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id) => { cancelled.push(id); frames.delete(id); },
  });
  return { instances, frames, cancelled, positions, cleanup, state: () => state };
}

test('Desktop Lenis runs on archive/detail/field/compare as well as the landing route', () => {
  for (const path of ['/', '/canvas', '/archive', '/archive/', '/glyph/test', '/field/test', '/compare/a/b', '/me']) {
    const mounted = mount(path);
    assert.equal(mounted.instances.length, 1, path);
    const instance = mounted.instances[0];
    const isArchive = path === '/archive' || path === '/archive/';
    assert.equal(instance.options.lerp, isArchive ? 0.25 : 0.05);
    assert.equal(instance.options.wheelMultiplier, isArchive ? 1 : 0.65);
    assert.equal(instance.options.syncTouch, !isArchive, 'Archive keeps touch scrolling native');
    assert.equal(instance.options.smoothWheel, true);
    assert.equal(instance.options.allowNestedScroll, true);
    assert.equal(instance.scroll.position, 0);
    assert.equal(instance.scroll.immediate, true);
    assert.equal(mounted.state(), instance);
    mounted.cleanup();
  }
});

test('Touch devices run Lenis with touch smoothing and clean up on every route', () => {
  for (const path of ['/', '/canvas', '/archive', '/glyph/test', '/field/test', '/compare/a/b']) {
    const mounted = mount(path, false, true);
    assert.equal(mounted.instances.length, 1, path);
    const instance = mounted.instances[0];
    assert.equal(instance.options.syncTouch, true, path);
    assert.equal(instance.options.allowNestedScroll, true);
    assert.equal(mounted.state(), instance);
    assert.equal(mounted.frames.size, 1, path);
    mounted.frames.get(1)(16);
    assert.equal(instance.lastFrame, 16);
    mounted.cleanup();
    assert.equal(instance.destroyed, true);
    assert.equal(mounted.state(), null);
    assert.deepEqual(mounted.cancelled, [2]);
  }
});

test('route cleanup cancels RAF and destroys the previous, potentially stopped Lenis', () => {
  const landing = mount('/');
  const instance = landing.instances[0];
  landing.frames.get(1)(16);
  assert.equal(instance.lastFrame, 16);
  instance.stop();
  landing.cleanup();
  assert.deepEqual(landing.cancelled, [2]);
  assert.equal(instance.destroyed, true);
  assert.equal(landing.state(), null);
  const archive = mount('/archive');
  assert.notEqual(archive.instances[0], instance);
  assert.equal(archive.instances[0].stopped, false);
  archive.cleanup();
});

test('reduced motion keeps native scrolling and does not start a Lenis RAF', () => {
  for (const coarse of [false, true]) {
    const mounted = mount('/archive', true, coarse);
    assert.equal(mounted.instances.length, 0);
    assert.equal(mounted.frames.size, 0);
    assert.deepEqual(mounted.positions, [[0, 0]]);
    assert.equal(mounted.cleanup, undefined);
  }
});

test('archive cards keep viewport-triggered formation rather than static thumbnails', () => {
  assert.match(archive, /<ArchiveDepthExplorer/);
  assert.match(depth, /<ArchiveArchetypeFeed/);
  assert.match(feed, /<ArchiveGlyph/);
  assert.match(gallery, /import LogogramRendererCanvas from/);
  assert.match(gallery, /<LogogramRendererCanvas model=\{ glyph\.model_data \} size=\{ canvasSize \} isActive=\{ visible \} \/>/);
  assert.match(gallery, /entry\.isIntersecting.*setVisible\(true\)/);
  assert.match(gallery, /visible && hasModel && canvasSize > 0/);
  assert.doesNotMatch(gallery, /<GlyphNode/);
});

test('depth transitions respect reduced motion and keep query navigation on existing Lenis', () => {
  assert.match(depth, /useReducedMotion/);
  assert.match(depth, /reducedMotion \? STILL_VARIANTS : DEPTH_VARIANTS/);
  assert.match(archive, /useArchiveScroll\(viewPath, ready && !interpreting && !meaningError\)/);
  assert.doesNotMatch(archive, /new Lenis|lenis\.stop\(|lenis\.destroy\(/);
  assert.match(gallery, /io\.disconnect\(\); ro\.disconnect\(\)/);
});

test('participation entry bypasses the intro without changing ordinary or name-share entry', () => {
  for (const [search, expected] of [['?create=1', true], ['?name=Louise', true], ['', false], ['?name=', false], ['?create=0', false]]) {
    assert.equal(Boolean(legacyCanvasLocation({ search })), expected);
  }
  assert.equal(legacyCanvasLocation({ search: '?create=1' }).pathname, APP_PATHS.canvas);
  assert.match(archive, /navigate\(APP_PATHS.canvas\)/);
});

test('reused renderer retains formation, offscreen/background pause and reduced-motion bypass', () => {
  assert.match(renderer, /if \(prefersReduced\) \{\s+paintStatic/);
  assert.match(renderer, /if \(t < totalMs\)/);
  assert.match(renderer, /drawInkParticle\(ctx/);
  assert.match(renderer, /visible && onScreen/);
  assert.match(renderer, /document\.addEventListener\('visibilitychange'/);
  assert.match(renderer, /cancelAnimationFrame\(raf\)/);
});
