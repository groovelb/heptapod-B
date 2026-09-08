/** Real audio controller + React lifecycle in memory; no browser or audible output. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const dom = new Window();
dom.document.body.innerHTML = '<div id="root"></div>';
let hidden = false;
let state = 'running';
let starts = 0;
let closes = 0;
let contexts = 0;
Object.defineProperty(dom.document, 'hidden', { get: () => hidden });
const param = () => ({ value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
const node = () => ({ gain: param(), frequency: param(), Q: param(), connect() {}, disconnect() {}, start() { starts++; }, stop() {} });
dom.AudioContext = class {
  constructor() { contexts++; this.sampleRate = 100; this.currentTime = 0; this.destination = {}; }
  get state() { return state; }
  createGain() { return node(); }
  createConvolver() { return node(); }
  createBufferSource() { return node(); }
  createOscillator() { return node(); }
  createBiquadFilter() { return node(); }
  createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
  resume() { return Promise.resolve(); }
  close() { closes++; return Promise.resolve(); }
};
const globals = { window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true, __soundClock: 0 };
const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement: h, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const server = await createServer({ configFile: false, plugins: [react(), {
  name: 'sound-clock', enforce: 'pre', transform(code, id) {
    return id.endsWith('/useGlyphFormationSound.js') ? code.replace('performance.now()', 'globalThis.__soundClock') : null;
  },
}], server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true }, appType: 'custom', logLevel: 'error' });
let root;
let checks = 0;
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++; };
try {
  const { default: useSound } = await server.ssrLoadModule('/src/hooks/useGlyphFormationSound.js');
  let cue;
  function Harness({ enabled }) { cue = useSound(enabled); return null; }
  root = createRoot(document.getElementById('root'));
  const render = (enabled) => act(async () => root.render(h(Harness, { enabled })));
  await render(false);
  cue(); equal(contexts, 0, 'Muted pages allocate no audio context');
  await render(true);
  equal(contexts, 1); equal(starts, 0, 'Mount only prepares audio, never plays a cue');
  cue(); cue(); cue(); cue();
  equal(starts, 3, 'Four simultaneous forms share one whoosh/boom/transient cue');
  globalThis.__soundClock = 500;
  cue(); equal(starts, 6, 'A later visible form receives its own cue');
  hidden = true; dom.document.dispatchEvent(new dom.Event('visibilitychange'));
  globalThis.__soundClock = 1000;
  cue(); equal(starts, 6, 'Hidden pages do not play');
  hidden = false; dom.document.dispatchEvent(new dom.Event('visibilitychange'));
  equal(starts, 6, 'Returning to a tab never replays an old cue');
  await render(false);
  equal(closes, 1, 'Mute disposes the active controller');
  cue(); equal(starts, 6);
  state = 'suspended';
  await render(true);
  cue(); equal(starts, 6, 'Autoplay blocking does not queue a delayed cue');
  state = 'running'; dom.dispatchEvent(new dom.Event('pointerdown'));
  equal(starts, 6, 'Unlocking audio does not replay a completed formation');
  globalThis.__soundClock = 1500;
  cue(); equal(starts, 9, 'The next formation plays after audio is unlocked');
  await act(async () => root.unmount()); root = null;
  equal(closes, contexts, 'Navigation releases every audio context');
  dom.dispatchEvent(new dom.Event('pointerdown'));
  equal(contexts, 2, 'Unmount removes gesture listeners');
  console.log(`Glyph formation sound: ${checks} checks passed; grouping, mute, autoplay, visibility and disposal (no browser/audio output).`);
} finally {
  if (root) await act(async () => root.unmount());
  await server.close(); await dom.happyDOM.abort();
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
}
