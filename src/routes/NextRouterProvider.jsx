'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Router } from 'react-router-dom';
import { createNextNavigator } from './nextNavigator';

const subscribe = (notify) => {
  const events = ['popstate', 'hashchange', 'next-route-state'];
  events.forEach((event) => window.addEventListener(event, notify));
  return () => events.forEach((event) => window.removeEventListener(event, notify));
};
const getSnapshot = () => JSON.stringify([window.location.hash, window.history.state?.usr ?? null, window.history.state?.key ?? 'default']);
const getServerSnapshot = () => '["",null,"default"]';

/** Next handles URLs; the existing view hooks and Storybook keep their router contract. */
export default function NextRouterProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const search = useSearchParams().toString();
  const browserState = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [hash, state, key] = JSON.parse(browserState);
  const navigator = useMemo(() => {
    // The browser is resolved on use, so the provider can render on the server.
    const browser = {
      get location() { return window.location; },
      get history() { return window.history; },
      get Event() { return window.Event; },
      dispatchEvent(event) { return window.dispatchEvent(event); },
    };
    return createNextNavigator(router, browser);
  }, [router]);
  return <Router navigator={ navigator } location={ { pathname, search: search ? `?${search}` : '', hash, state, key: `${pathname}?${search}${hash}:${key}` } }>
    { children }
  </Router>;
}
