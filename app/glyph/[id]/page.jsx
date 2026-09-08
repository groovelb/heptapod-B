import NextRouteView from '../../../src/routes/NextRouteView';
import { pageMetadata } from '../../../src/lib/pageMetadata';

export const dynamic = 'force-dynamic';
export const generateMetadata = (props) => pageMetadata('glyph', props);
export default function GlyphPage() { return <NextRouteView />; }
