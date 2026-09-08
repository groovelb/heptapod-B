import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createNextNavigator } from './nextNavigator.js';

test('archive query navigation preserves the page and supports replace, hash and history', () => {
  const browser = new Window({ url: 'http://localhost/archive' });
  const calls = [];
  const router = { push: (...args) => calls.push(['push', ...args]), replace: (...args) => calls.push(['replace', ...args]) };
  const navigator = createNextNavigator(router, browser);
  let updates = 0;
  browser.addEventListener('next-route-state', () => updates++);
  navigator.push({ pathname: '/archive', search: '?group=echo', hash: '#glyph' }, { from: 'archive' });
  assert.equal(browser.location.pathname, '/archive');
  assert.equal(browser.location.search, '?group=echo');
  assert.equal(browser.location.hash, '#glyph');
  assert.deepEqual(browser.history.state.usr, { from: 'archive' });
  assert.equal(calls.length, 0, 'Query changes must not request another page tree');
  const length = browser.history.length;
  navigator.replace('/archive?group=echo&selected=one');
  assert.equal(browser.history.length, length);
  assert.equal(browser.location.hash, '');
  assert.equal(updates, 2);
  let delta;
  browser.history.go = (value) => { delta = value; };
  navigator.go(-1);
  assert.equal(delta, -1);
});

test('page links use Next navigation without competing scroll reset', () => {
  const browser = new Window({ url: 'http://localhost/archive?group=echo' });
  const calls = [];
  const navigator = createNextNavigator({ push: (...args) => calls.push(['push', ...args]), replace: (...args) => calls.push(['replace', ...args]) }, browser);
  navigator.push('/glyph/example');
  navigator.replace({ pathname: '/canvas', search: '?name=Louise&v=2', hash: '#glyph' });
  assert.deepEqual(calls, [
    ['push', '/glyph/example', { scroll: false }],
    ['replace', '/canvas?name=Louise&v=2#glyph', { scroll: false }],
  ]);
  assert.equal(navigator.createHref({ pathname: '/compare/one/two', search: '?reading=meaning' }), '/compare/one/two?reading=meaning');
  assert.deepEqual(navigator.encodeLocation('/canvas?name=민준#glyph'), { pathname: '/canvas', search: '?name=%EB%AF%BC%EC%A4%80', hash: '#glyph' });
});
