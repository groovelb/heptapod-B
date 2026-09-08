/** Keep query-only archive transitions in the current tree; Next owns page transitions. */
export function createNextNavigator(router, browser) {
  const hrefFor = (to) => typeof to === 'string' ? to : `${to.pathname || browser.location.pathname}${to.search || ''}${to.hash || ''}`;
  function navigate(to, state, replace = false) {
    const href = hrefFor(to);
    const destination = new URL(href, browser.location.href);
    if (destination.origin !== browser.location.origin) {
      if (replace) browser.location.replace(destination.href);
      else browser.location.assign(destination.href);
      return;
    }
    if (destination.pathname === browser.location.pathname) {
      const entry = { usr: state ?? null, key: Math.random().toString(36).slice(2) };
      browser.history[replace ? 'replaceState' : 'pushState'](entry, '', href);
      browser.dispatchEvent(new browser.Event('next-route-state'));
      return;
    }
    router[replace ? 'replace' : 'push'](href, { scroll: false });
  }
  return {
    createHref: hrefFor,
    encodeLocation(to) {
      const url = new URL(hrefFor(to), browser.location.href);
      return { pathname: url.pathname, search: url.search, hash: url.hash };
    },
    go(delta) { browser.history.go(delta); },
    push(to, state) { navigate(to, state); },
    replace(to, state) { navigate(to, state, true); },
  };
}
