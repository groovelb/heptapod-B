import NextRouteView from '../../../src/routes/NextRouteView';
import { pageMetadata } from '../../../src/lib/pageMetadata';

export const dynamic = 'force-dynamic';
export const generateMetadata = (props) => pageMetadata('field', props);
export default function FieldPage() { return <NextRouteView />; }
