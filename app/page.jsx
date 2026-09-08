import { redirect } from 'next/navigation';
import NextRouteView from '../src/routes/NextRouteView';
import { legacyCanvasLocation } from '../src/routes/paths';
import { pageMetadata } from '../src/lib/pageMetadata';

export const dynamic = 'force-dynamic';
export const generateMetadata = (props) => pageMetadata('landing', props);

export default async function LandingPage({ searchParams }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams || {})) {
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, item);
  }
  const legacy = legacyCanvasLocation({ search: params.toString() });
  if (legacy) redirect(`${legacy.pathname}${legacy.search}`);
  return <NextRouteView />;
}
