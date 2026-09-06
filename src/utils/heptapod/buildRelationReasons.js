import { sourceText as t } from '../../i18n/messages.js';
/** One wording source for comparison, numbered observations and share cards. */
const CLUSTER_TYPE_LABELS = { blob: t('buildRelationReasons.clustered'), spike: t('buildRelationReasons.radial'), wisp: t('buildRelationReasons.flowing'), hook: t('buildRelationReasons.hooked') };
const QUADRANT_LABELS = { Crown: t('buildRelationReasons.top'), Wake: t('buildRelationReasons.right'), Root: t('buildRelationReasons.bottom'), Veil: t('buildRelationReasons.left') };

export function buildRelationReasons(relationType, components = {}) {
  if (!['FORM', 'VARIANT'].includes(relationType)) return [];
  return (components.observations || [])
    .filter((observation) => typeof observation.reason === 'string' && observation.reason.length > 0)
    .slice(0, 4).map((observation) => observation.reason);
}
export { CLUSTER_TYPE_LABELS, QUADRANT_LABELS };
