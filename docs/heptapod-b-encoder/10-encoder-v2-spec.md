# Encoder v2 — 기술 스펙

> Gate 2 승인용 문서. 현재 인코더(v1) 실측 분석 → v2 확정 스펙 → 마이그레이션 경로.
> 코드 레퍼런스는 `파일명:라인` 형식.

---

## 1. 현재 Encoder v1 분석

### 1.1 인코딩 파이프라인

```
name (원문)
  │
  ▼ NFD 정규화 (한글 음절 → 자모 분해)          encode.js:84
  │
  ▼ xmur3 해시 (32bit unsigned)                 encode.js:19–31
  │
  ▼ createPrng(streamId)                        encode.js:96–104
  │   └─ streamId별 독립 sfc32 스트림 (12회 워밍업)
  │
  ▼ buildModel(seed, options)                   buildModel.js:56–210
  │   ├─ 링: harmonics(k=1,2,3), pressure, strands, dropZones, inkLoads, gap
  │   ├─ 클러스터: 1~3개, jamo 코드로 유형·가시 수 결정
  │   ├─ 의문형 갈고리: 분리된 'hook' 스트림 (본체 불변)
  │   └─ 호환 필드: ring, slots[12], branches[]
  │
  ▼ LogogramModel (JSON, 순수 데이터)
  │
  ▼ 렌더러 3종: SVG → Canvas 2D (particles) → WebGL (fluid)
```

**가역 경로** (reversibleCodec.js + reversibleModel.js):

```
name
  │
  ▼ NFD + 의문형 분리                           reversibleCodec.js:96–105
  │
  ▼ textToTokens → tokensToInt (bijective base-K)  reversibleCodec.js:114–121
  │   K = 130 (공백 1 + 초성 19 + 중성 21 + 종성 27 + A-Z 26 + a-z 26 + 0-9 10)
  │
  ▼ intToBuckets (혼합진법 분해)                 reversibleCodec.js:164–185
  │   고정 자릿수: harm1(8)·harm2(8)·harm3(8)·gapState(17)·strand(3)·weightSlot(24)
  │   가변 자릿수: 클러스터 셀 × 1~3 (각 768 = TYPE4·SPIKE8·SLOT12·DIR2)
  │
  ▼ buildModelReversible(name)                  reversibleModel.js:57–174
  │   데이터 채널 → 복원 가능한 시각 특징
  │   표현 채널 → N 시드 PRNG 장식 (정보 0)
  │
  ▼ decode(model) → 원본 이름 복원              reversibleModel.js:222–227
```

### 1.2 결정론 보장 메커니즘

| 단계 | 메커니즘 | 코드 |
|---|---|---|
| 해시 | xmur3: 문자열 → 반복 호출 가능한 32bit 생성기 | encode.js:19–31 |
| PRNG | sfc32: 4×32bit 시드 → [0,1) 스트림, 12회 워밍업 | encode.js:42–56, :99 |
| 스트림 분리 | `createPrng(streamId)`: `"${normalized} ${streamId}"` 접두어로 완전 독립 | encode.js:97 |
| 의문형 격리 | 'body' vs 'hook' 스트림 분리 → 갈고리 토글이 본체에 영향 0 | buildModel.js:142–150 |
| 가역 경로 | BigInt 정밀 연산, 외부 라이브러리 0, 전단사(bijective) base-K | reversibleCodec.js:114–121 |

### 1.3 지원 문자 범위 (코드 실측)

**v1 비가역 경로** (encode.js):
- NFD 정규화만 수행 → **모든 유니코드 문자 입력 가능** (encode.js:84)
- 공백 제외 후 NFD 유닛 배열로 사용 (encode.js:85)
- 해시는 `charCodeAt` 기반이므로 BMP 외 문자도 서로게이트 쌍으로 처리됨

**v1 가역 경로** (reversibleCodec.js):
- 고정 알파벳 K=130자만 지원 (reversibleCodec.js:16–25):
  - 공백 (U+0020) — 1자
  - 한글 초성 (U+1100–U+1112) — 19자
  - 한글 중성 (U+1161–U+1175) — 21자
  - 한글 종성 (U+11A8–U+11C2) — 27자
  - Latin 대문자 A–Z — 26자
  - Latin 소문자 a–z — 26자
  - 숫자 0–9 — 10자
- 알파벳 밖 문자는 **조용히 제거**됨 (reversibleCodec.js:101–103)
- 일본어(히라가나/가타카나), CJK 한자, 이모지, 키릴, 아랍어 등 미지원

### 1.4 현재 한계점

| 한계 | 영향 | v2 대응 |
|---|---|---|
| 알파벳 밖 문자 무시 제거 | `田中太郎` → 빈 문자열, 복원 불가 | 지원 범위 확장 + overflow 차단 |
| 대소문자 구분 | `Louise`와 `louise`가 다른 Glyph | canonical case fold 도입 |
| 최대 길이 미정 | 긴 문장도 인코딩 시도 → overflow 플래그만 | 명시적 길이 상한 + publish 차단 |
| 32bit hash로 동일성 판정 | 충돌 확률 ~0.01% @10K 이름 | SHA-256 fingerprint로 교체 |
| 의문형 `?` 본체에 포함 후 분리 | 가역 경로에서만 분리 | canonicalization에서 일관 분리 |
| 버전 관리 없음 | 알고리즘 변경 시 기존 Glyph 재현 불가 | encoderVersion 레지스트리 |

---

## 2. Encoder v2 스펙

### 2.1 지원 문자 범위

**원칙**: Unicode BMP(U+0000–U+FFFF) 내 "사람 이름에 사용되는 문자"를 포괄한다. Supplementary Plane(이모지 등)은 v2에서 제외한다.

| 범주 | 코드포인트 범위 | 문자 수 | 비고 |
|---|---|---|---|
| 공백 | U+0020 | 1 | 단어 구분 |
| 한글 초성 | U+1100–U+1112 | 19 | NFD 결합 자모 |
| 한글 중성 | U+1161–U+1175 | 21 | |
| 한글 종성 | U+11A8–U+11C2 | 27 | |
| Latin 기본 | A–Z, a–z | 52 | |
| 숫자 | 0–9 | 10 | |
| Latin 확장 (악센트) | U+00C0–U+024F에서 NFD 분해 후 기본 Latin + 결합 기호 | — | NFD 분해 시 기본 알파벳으로 환원 |
| CJK 통합 한자 | U+4E00–U+9FFF | 20,992 | 일본어·중국어 이름 |
| 히라가나 | U+3040–U+309F | 96 | |
| 가타카나 | U+30A0–U+30FF | 96 | |
| 키릴 기본 | U+0400–U+04FF | 256 | 러시아어 등 |
| 아랍어 기본 | U+0600–U+06FF | 256 | |
| 데바나가리 | U+0900–U+097F | 128 | 힌디어 등 |
| 하이픈/아포스트로피 | U+002D, U+2019 | 2 | O'Brien, Kim-Lee |
| 마침표 | U+002E | 1 | 약어 (Jr., St.) |

**K_v2 계산**: 위 범위의 정확한 문자 수를 알파벳 빌더에서 열거한다. 예상 K_v2 ≈ 21,957.

**제외 (v2 범위 밖)**:
- 이모지 (U+1F000+ Supplementary Plane)
- 제어 문자 (U+0000–U+001F)
- 사용자 정의 영역 (U+E000–U+F8FF)
- 범위 밖 문자 입력 시 → 2.6 Overflow 처리

### 2.2 최대 입력 길이

```
최대 grapheme 수: 64자 (NFC 기준)
최대 UTF-8 바이트: 256바이트
```

- 두 조건 중 하나라도 초과하면 입력 필드에서 실시간 차단 (타이핑 불가)
- 근거: 가장 긴 실제 인명은 ~40자 (아이슬란드어 등). 64자는 충분한 여유 + 짧은 문장 허용
- bijective base-K_v2에서 64토큰의 N 크기: `K_v2^64` ≈ `2^905` — 가역 코덱 용량(`≈2^43` 현재) 초과 → v2 코덱 용량 확장 또는 비가역 모드 자동 전환 필요 (2.7 참조)

### 2.3 Canonicalization 파이프라인

02-ux-flow.md §이름 정규화와 공개 식별 규칙에 명시된 순서를 구현한다.

```
원문 입력
  │
  ▼ Step 1: 의문형 분리
  │  /[?？]/g 를 body에서 제거, isInterrogative = true/false 저장
  │
  ▼ Step 2: Unicode NFC 정규화
  │  String.prototype.normalize('NFC')
  │  (한글 자모 → 완성형 음절 결합, 분음 기호 + 기본 문자 → 합성 문자)
  │
  ▼ Step 3: Trim
  │  앞뒤 공백 제거 (String.prototype.trim())
  │
  ▼ Step 4: 연속 공백 축약
  │  /\s+/g → ' ' (모든 유니코드 공백류를 단일 ASCII 공백으로)
  │
  ▼ Step 5: Locale-neutral case fold
  │  String.prototype.toLocaleLowerCase() 대신
  │  ICU Case Folding (Unicode CaseFolding.txt Full mapping) 사용
  │  → 'ß' → 'ss', 'İ' → 'i̇' 등 locale 독립 결과
  │  (브라우저: Intl 불가 시 .toLowerCase() 폴백, 서버: 정확한 case fold)
  │
  ▼ canonicalName (저장·비교용)
```

**표시 이름(displayName)**: 원문에서 앞뒤 공백만 제거한 것. contribution 문맥에서 보존.

**구현 파일**: `src/utils/heptapod/normalizeName.js`

```js
// normalizeName.js 인터페이스 초안
export function normalizeName(raw) {
  // returns { displayName, canonicalName, isInterrogative }
}
```

### 2.4 Fingerprint

동일 Glyph 판정용. 현재 32bit xmur3 해시를 대체한다.

```
fingerprint = SHA-256( canonicalName + '\x00' + (isInterrogative ? '1' : '0') + '\x00' + encoderVersion )
```

- 구분자 `\x00` (null byte): 이름에 출현 불가 → 충돌 방지
- `encoderVersion`: 문자열 `"v1"`, `"v2"` 등
- 출력: 64자 hex 문자열 (256bit)
- 브라우저: `crypto.subtle.digest('SHA-256', ...)`
- 서버: Node.js `crypto.createHash('sha256')`

```js
// 구현 예시
export async function computeFingerprint(canonicalName, isInterrogative, encoderVersion) {
  const input = `${canonicalName}\x00${isInterrogative ? '1' : '0'}\x00${encoderVersion}`;
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### 2.5 의문형 분리

canonicalization Step 1에서 처리. v1 가역 경로(reversibleCodec.js:98)와 동일한 패턴이나, v2에서는 **모든 경로에서 일관 적용**:

```js
const INTERROGATIVE_RE = /[?？]/g;

function separateInterrogative(raw) {
  const isInterrogative = INTERROGATIVE_RE.test(raw);
  const body = raw.replace(INTERROGATIVE_RE, '');
  return { body, isInterrogative };
}
```

- `?` (U+003F) 와 `？` (U+FF1F, 전각) 모두 감지
- 본체(body)에서 완전히 제거 후 `isInterrogative` 플래그로 저장
- Glyph 모델에서 의문형 갈고리는 분리된 PRNG 스트림으로 생성 (기존 'hook' 스트림 유지)

### 2.6 Overflow 처리

02-ux-flow.md 규칙 5: "지원하지 않는 문자와 용량 초과를 조용히 버리지 않는다."

```
validateName(raw) → { valid, errors[] }
```

| 검증 항목 | 에러 코드 | 사용자 메시지 (한/영) | publish 차단 |
|---|---|---|---|
| 빈 문자열 (trim 후) | `EMPTY` | "이름을 입력해 주세요" | Yes |
| 길이 초과 (>64 grapheme 또는 >256 byte) | `TOO_LONG` | "이름이 너무 깁니다 (최대 64자)" | Yes |
| 지원 범위 밖 문자 포함 | `UNSUPPORTED_CHAR` | "지원하지 않는 문자가 포함되어 있습니다: {문자}" | Yes |
| 가역 코덱 용량 초과 (overflow) | `CODEC_OVERFLOW` | "이 이름은 현재 코덱으로 완전히 인코딩할 수 없습니다" | Yes |

**UX 동작**:
- 입력 필드: 실시간 검증, 에러 시 필드 하단에 인라인 메시지
- ENCODE 버튼: 검증 실패 시 비활성
- PUBLISH 버튼: 검증 통과한 경우만 활성 (overflow 포함하여 모두 차단)
- 인코딩 자체는 허용 (로컬에서 미리보기), publish만 차단

**구현 파일**: `src/utils/heptapod/validateName.js`

```js
// validateName.js 인터페이스 초안
export function validateName(raw, options = {}) {
  // options: { encoderVersion: 'v2' }
  // returns { valid: boolean, errors: Array<{ code, message, detail? }>, warnings: [] }
}
```

### 2.7 버전 Registry

v1으로 생성된 Glyph와 v2 Glyph가 공존해야 한다.

```
src/utils/heptapod/registry.js

export const ENCODER_VERSIONS = {
  v1: {
    encode: () => import('./encode.js'),
    buildModel: () => import('./buildModel.js'),
    codec: null, // v1 비가역에는 codec 없음
    reversibleModel: () => import('./reversibleModel.js'),
    reversibleCodec: () => import('./reversibleCodec.js'),
    alphabet: 130, // K
    maxLength: Infinity, // v1은 제한 없었음
    canonicalize: (name) => name, // v1은 canonicalization 없음
  },
  v2: {
    encode: () => import('./encode-v2.js'),
    buildModel: () => import('./buildModel-v2.js'),
    codec: () => import('./reversibleCodec-v2.js'),
    reversibleModel: () => import('./reversibleModel-v2.js'),
    reversibleCodec: () => import('./reversibleCodec-v2.js'),
    alphabet: K_V2,
    maxLength: 64,
    canonicalize: (name) => normalizeName(name).canonicalName,
  },
};

export const CURRENT_VERSION = 'v2';
```

**원칙**:
- 새 인코딩은 항상 `CURRENT_VERSION`으로 생성
- 기존 Glyph 조회/렌더 시 `glyph.encoderVersion`으로 해당 버전의 모듈을 로드
- 버전별 모듈은 동적 import로 lazy load (v1 코드를 항상 번들에 포함하지 않음)
- fingerprint에 `encoderVersion`이 포함되므로 같은 이름이라도 v1/v2 Glyph는 별개

### 2.8 기존 v1 Glyph 호환성

| 시나리오 | 동작 |
|---|---|
| v1 Glyph 렌더링 | registry에서 v1 모듈 로드, 동일하게 렌더 |
| v1 Glyph 상세 보기 | `encoderVersion: 'v1'` 표시, v1 decode 사용 |
| v1 이름과 v2 이름 관계 | fingerprint가 다르므로 `SAME`이 아닌 `VARIANT` 또는 독립 |
| v1 Glyph를 v2로 업그레이드 | 지원하지 않음 (버전은 생성 시점에 고정) |
| URL 공유 (`?name=`) | 기존 v1 로컬 재현 경로 유지, 새 공개 경로는 `/glyph/:publicId` |

---

## 3. v2 코덱 용량 문제와 설계 결정

### 3.1 문제

v1 가역 코덱의 용량:

```
고정 자릿수: 8×8×8×17×3×24 = 1,884,672 (≈20.8비트)
+ 클러스터 3셀: 768³ = 452,984,832 (≈28.7비트)
총: ≈49.5비트 → K=130 기준 최대 약 6~7 토큰
```

v2 알파벳 확장(K≈21,957) 시 같은 비트로 표현 가능한 토큰 수가 더 줄어든다 (log₂(21957) ≈ 14.4비트/토큰 vs log₂(130) ≈ 7.0비트/토큰).

### 3.2 해결 방향 (승인 필요)

**Option A — 가역 포기, 비가역 전용**:
- v2는 xmur3+sfc32 비가역 경로만 사용
- 이름 복원은 DB에 저장된 `canonicalName`으로 수행
- 장점: 용량 제한 없음, 코덱 복잡도 제거
- 단점: 오프라인/DB 없이 Glyph에서 이름 복원 불가

**Option B — 코덱 용량 대폭 확장**:
- 데이터 채널을 늘림 (링 하모닉 단계 수 증가, 클러스터 셀 확장, 추가 시각 채널)
- 장점: 오프라인 복원 유지
- 단점: 시각적 양자화가 거칠어질 수 있음, 복잡도 증가

**Option C — 하이브리드 (권장)**:
- 짧은 이름 (≤ 코덱 용량): 가역 모드 (오프라인 복원 가능)
- 긴 이름 (> 코덱 용량): 비가역 모드 + DB 저장 이름으로 복원
- `model.meta.reversible` 플래그로 구분 (이미 v1에 존재: reversibleModel.js:157)
- 장점: 대부분의 짧은 이름은 가역, 긴 이름/확장 문자도 지원
- 단점: 두 경로 유지

### 3.3 권장 결정

**Option C (하이브리드)** 를 권장한다:
- 공개 Archive에서는 DB에 canonicalName이 항상 저장되므로 비가역이어도 복원 가능
- 로컬(비공개) 사용에서는 짧은 이름의 가역성이 URL 공유 재현에 유용
- v1 가역 경로와의 일관성 유지

---

## 4. 마이그레이션 경로

### 4.1 v1 → v2 전환 시 기존 로컬 Glyph 처리

- **로컬 Glyph** (publish되지 않은 것): 사용자 브라우저에만 존재
  - `?name=` URL로 공유된 것 → v1 모듈로 재현, 하단에 "v1 인코딩" 표시
  - localStorage에 저장된 최근 기록 → v1 모듈로 렌더, v2 재인코딩 제안 불필요
- **공개 Glyph** (publish된 것): DB에 `encoderVersion: 'v1'` 저장
  - 렌더 시 v1 모듈 사용
  - 관계 계산 시 v1 Glyph의 feature도 동일하게 추출 가능 (형태 모델 스키마 동일)
  - v2로 "재발행"은 지원하지 않음 (fingerprint가 달라져 별개 Glyph가 됨)

### 4.2 모듈 인터페이스 초안

#### `normalizeName.js`

```js
/**
 * 이름 정규화 모듈
 *
 * @param {string} raw - 사용자 입력 원문 [Required]
 * @returns {{
 *   displayName: string,      // 앞뒤 공백만 제거한 표시용 이름
 *   canonicalName: string,    // NFC → trim → 공백 축약 → case fold
 *   isInterrogative: boolean, // ?/？ 포함 여부
 *   nfcBody: string,          // 의문형 분리 + NFC 정규화된 본체
 * }}
 */
export function normalizeName(raw) { ... }

/**
 * 두 이름이 같은 canonical Glyph인지 판정
 *
 * @param {string} rawA - 이름 A [Required]
 * @param {string} rawB - 이름 B [Required]
 * @returns {boolean}
 */
export function isSameCanonical(rawA, rawB) { ... }
```

#### `validateName.js`

```js
/**
 * 이름 유효성 검증 모듈
 *
 * @param {string} raw - 사용자 입력 원문 [Required]
 * @param {object} options - { encoderVersion?: 'v1'|'v2', mode?: 'input'|'publish' } [Optional]
 * @returns {{
 *   valid: boolean,
 *   canEncode: boolean,       // 인코딩(미리보기) 가능 여부
 *   canPublish: boolean,      // 공개 가능 여부 (더 엄격)
 *   errors: Array<{ code: string, message: string, detail?: string }>,
 *   warnings: Array<{ code: string, message: string }>,
 *   meta: {
 *     graphemeCount: number,
 *     byteLength: number,
 *     hasUnsupportedChars: boolean,
 *     unsupportedChars: string[],
 *     wouldOverflow: boolean,
 *   }
 * }}
 */
export function validateName(raw, options = {}) { ... }

/**
 * 지원 문자 범위 확인 (단일 문자)
 *
 * @param {string} char - 검사할 문자 [Required]
 * @param {string} encoderVersion - 'v1' | 'v2' [Optional, 기본값: 'v2']
 * @returns {boolean}
 */
export function isSupportedChar(char, encoderVersion = 'v2') { ... }
```

---

## 5. 구현 우선순위

| 순서 | 모듈 | 의존성 | 비고 |
|---|---|---|---|
| 1 | `normalizeName.js` | 없음 | 순수 함수, 즉시 구현 가능 |
| 2 | `validateName.js` | normalizeName | 순수 함수, 즉시 구현 가능 |
| 3 | fingerprint 유틸 | normalizeName | `crypto.subtle` 사용, 비동기 |
| 4 | v2 알파벳 빌더 | 없음 | K_v2 확정 필요 |
| 5 | v2 코덱 (가역/하이브리드) | 알파벳, normalizeName | 용량 설계 결정(§3) 승인 후 |
| 6 | registry.js | 모든 v1/v2 모듈 | 동적 import 구조 |
| 7 | encode-v2.js + buildModel-v2.js | 알파벳, normalizeName | v1 기반 확장 |

---

## 6. 승인 필요 사항

이 스펙을 기반으로 구현을 시작하기 전 확정이 필요한 결정:

1. **CJK/다국어 범위**: §2.1의 문자 범위가 적절한가? 추가/제외할 스크립트가 있는가?
2. **최대 길이 64자**: 사용 시나리오상 충분한가? (이름 vs 짧은 문장 허용 여부)
3. **코덱 전략**: §3.2의 Option A/B/C 중 어느 것? (권장: C 하이브리드)
4. **case fold 수준**: 브라우저에서 `.toLowerCase()` 폴백을 허용할 것인가, 아니면 Unicode CaseFolding 테이블을 번들에 포함할 것인가?
5. **v1 Glyph 관계**: v1과 v2로 인코딩된 같은 canonical name의 Glyph를 `VARIANT` 관계로 연결할 것인가?
