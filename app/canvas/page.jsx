import NextRouteView from '../../src/routes/NextRouteView';
import { pageMetadata } from '../../src/lib/pageMetadata';

export const dynamic = 'force-dynamic';
export const generateMetadata = (props) => pageMetadata('canvas', props);
export default function CanvasPage() { return <NextRouteView />; }
