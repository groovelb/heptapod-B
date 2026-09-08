import { notFound } from 'next/navigation';
import NextRouteView from '../../../../src/routes/NextRouteView';
import { pageMetadata } from '../../../../src/lib/pageMetadata';

export const dynamic = 'force-dynamic';
async function comparisonProps(props) {
  const { leftId, rightId = [] } = await props.params;
  if (rightId.length > 1) notFound();
  return { ...props, params: { leftId, rightId: rightId[0] } };
}
export const generateMetadata = async (props) => pageMetadata('compare', await comparisonProps(props));
export default async function ComparePage(props) {
  await comparisonProps(props);
  return <NextRouteView />;
}
