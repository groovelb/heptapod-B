/**
 * Heptapod B Encoder — Name Validation (v2)
 *
 * Archive publish 전 이름 유효성 검사. normalizeName으로 정규화한 뒤
 * 길이·문자 범위를 확인하고, 통과 시 canonical 데이터를 함께 반환한다.
 *
 * 에러 코드:
 * - EMPTY: 빈 문자열 또는 공백만
 * - TOO_LONG: 64 grapheme 또는 256 byte 초과
 * - UNSUPPORTED_CHAR: BMP 밖 문자 또는 제어 문자
 *
 * @param {string} raw - 사용자 원본 입력 [Required]
 * @returns {{
 *   valid: boolean,
 *   error: null | { code: string, message: string },
 *   canonical: { canonicalName: string, isInterrogative: boolean, displayName: string }
 * }}
 *
 * Example usage:
 * validateName('Louise') → { valid: true, error: null, canonical: { ... } }
 * validateName('') → { valid: false, error: { code: 'EMPTY', ... }, canonical: { ... } }
 */
import { normalizeName } from './normalizeName.js';

const MAX_GRAPHEMES = 64;
const MAX_BYTES = 256;

/**
 * 지원 문자 판별. BMP 내 다음 범위만 허용:
 * - 한글 완성형 (AC00~D7AF)
 * - 한글 자모 (1100~11FF, 3130~318F)
 * - Latin (0041~024F)
 * - CJK Unified (4E00~9FFF)
 * - 히라가나 (3040~309F)
 * - 가타카나 (30A0~30FF)
 * - 숫자 (0030~0039)
 * - 공백 (0020)
 * - 하이픈 (002D), 아포스트로피 (0027, 2019), 마침표 (002E)
 * - 의문형은 normalizeName에서 이미 분리됨 — 여기서는 body만 검사
 *
 * @param {number} cp - 코드 포인트
 * @returns {boolean}
 */
function isSupportedCodePoint(cp) {
  if (cp === 0x20) return true; // space
  if (cp === 0x2D) return true; // hyphen
  if (cp === 0x27 || cp === 0x2019) return true; // apostrophe, right single quote
  if (cp === 0x2E) return true; // period
  if (cp >= 0x30 && cp <= 0x39) return true; // digits
  if (cp >= 0x41 && cp <= 0x5A) return true; // A-Z
  if (cp >= 0x61 && cp <= 0x7A) return true; // a-z
  if (cp >= 0xC0 && cp <= 0x024F) return true; // Latin Extended
  if (cp >= 0x0300 && cp <= 0x036F) return true; // combining marks (e.g. lowercase İ)
  if (cp >= 0x1100 && cp <= 0x11FF) return true; // Hangul Jamo
  if (cp >= 0x3040 && cp <= 0x309F) return true; // Hiragana
  if (cp >= 0x30A0 && cp <= 0x30FF) return true; // Katakana
  if (cp >= 0x3130 && cp <= 0x318F) return true; // Hangul Compatibility Jamo
  if (cp >= 0x4E00 && cp <= 0x9FFF) return true; // CJK Unified
  if (cp >= 0xAC00 && cp <= 0xD7AF) return true; // Hangul Syllables
  return false;
}

export function validateName(raw) {
  const canonical = normalizeName(raw);
  const { canonicalName } = canonical;

  if (canonicalName.length === 0) {
    return {
      valid: false,
      error: { code: 'EMPTY', message: '이름을 입력해 주세요.' },
      canonical,
    };
  }

  const graphemes = Array.from(new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(canonicalName));
  if (graphemes.length > MAX_GRAPHEMES) {
    return {
      valid: false,
      error: {
        code: 'TOO_LONG',
        message: `이름은 ${MAX_GRAPHEMES}자 이하여야 합니다.`,
      },
      canonical,
    };
  }

  const byteLength = new TextEncoder().encode(canonicalName).length;
  if (byteLength > MAX_BYTES) {
    return {
      valid: false,
      error: {
        code: 'TOO_LONG',
        message: `이름이 너무 깁니다 (${MAX_BYTES}바이트 초과).`,
      },
      canonical,
    };
  }

  for (const ch of canonicalName) {
    const cp = ch.codePointAt(0);
    if (!isSupportedCodePoint(cp)) {
      return {
        valid: false,
        error: {
          code: 'UNSUPPORTED_CHAR',
          message: `지원하지 않는 문자가 포함되어 있습니다: "${ch}"`,
        },
        canonical,
      };
    }
  }

  return { valid: true, error: null, canonical };
}

export default validateName;
