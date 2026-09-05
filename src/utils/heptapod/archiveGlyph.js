/** Canonical archive encoding. Existing stored models are never regenerated here. */
import { validateName } from './validateName.js';
import { encode } from './encode.js';
import { buildModel } from './buildModel.js';
import { buildModelReversible, decode } from './reversibleModel.js';
import { encodeReversible } from './reversibleCodec.js';
import { extractGlyphFeatures } from './extractGlyphFeatures.js';

export const ARCHIVE_ENCODER_VERSION = 2;

function validatedName(rawName) {
  const result = validateName(rawName);
  if (!result.valid) {
    const error = new Error(result.error.message);
    error.code = result.error.code;
    throw error;
  }
  return result.canonical;
}

/** One model contract for local preview and server publishing, preserving all canonical text. */
export function buildArchiveModel(rawName) {
  const { canonicalName, isInterrogative } = validatedName(rawName);
  const name = `${canonicalName}${isInterrogative ? '?' : ''}`;
  const encoded = encodeReversible(name);
  let model;
  let encodingMode = 'deterministic';
  let fallbackReason = encoded.supported ? 'capacity-exceeded' : 'unsupported-codec-characters';

  if (encoded.supported && !encoded.overflow) {
    const candidate = buildModelReversible(name);
    if (decode(candidate).name === name) {
      model = candidate;
      encodingMode = 'reversible';
      fallbackReason = null;
    } else {
      fallbackReason = 'roundtrip-mismatch';
    }
  }

  // The question hook has its own stream; toggling it leaves the body unchanged.
  if (!model) model = buildModel(encode(canonicalName), { questionHook: isInterrogative });
  model.meta = {
    ...model.meta,
    name,
    canonicalName,
    encoderVersion: ARCHIVE_ENCODER_VERSION,
    encodingMode,
    reversible: encodingMode === 'reversible',
    overflow: encoded.overflow,
    fallbackReason,
  };
  return model;
}

/** SHA-256 identity includes version and question state; display spelling is not identity. */
export async function prepareArchiveGlyph(rawName) {
  const canonical = validatedName(rawName);
  const modelData = buildArchiveModel(rawName);
  const featureVector = extractGlyphFeatures(modelData);
  const identity = JSON.stringify([
    'response-archive', ARCHIVE_ENCODER_VERSION, canonical.canonicalName, canonical.isInterrogative,
  ]);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
  const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return {
    ...canonical,
    fingerprint,
    encoderVersion: ARCHIVE_ENCODER_VERSION,
    modelData,
    featureVector,
    contour: featureVector.contourLineage,
  };
}
