/**
 * Heptapod B Encoder — Canonical Name Normalization (v2)
 *
 * Archive publish용 정규화. encode.js(NFD 해시)와 별개로,
 * 동일 이름 판정에 쓰이는 canonical name을 NFC 기반으로 만든다.
 *
 * 파이프라인 (02-ux-flow.md §데이터 모델 활용):
 * 1. 의문형(`?` `？`) 분리 → isInterrogative 플래그
 * 2. NFC 정규화
 * 3. trim
 * 4. 연속 공백 → 단일 스페이스
 * 5. locale-neutral case fold (toLowerCase)
 *
 * @param {string} raw - 사용자 원본 입력 [Required]
 * @returns {{
 *   canonicalName: string,
 *   isInterrogative: boolean,
 *   displayName: string
 * }}
 *
 * Example usage:
 * normalizeName('  Louise? ') → { canonicalName: 'louise', isInterrogative: true, displayName: 'Louise?' }
 */
export function normalizeName(raw) {
  const input = typeof raw === 'string' ? raw : '';

  const displayName = input.trim();

  const isInterrogative = /[?？]/.test(input);
  const body = input.replace(/[?？]/g, '');

  const canonicalName = body
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFC');

  return { canonicalName, isInterrogative, displayName };
}

export default normalizeName;
