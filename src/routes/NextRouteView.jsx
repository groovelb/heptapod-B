'use client';

import dynamic from 'next/dynamic';

// Canvas, media and WebGL views run after hydration. Server pages still supply metadata.
const RouteView = dynamic(() => import('./AppRoutes'), { ssr: false });

/** Root layout owns persistent providers. Path matching retains the existing params API. */
export default function NextRouteView() {
  return <RouteView withSession={ false } />;
}
