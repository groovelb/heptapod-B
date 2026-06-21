# LogogramModel — 렌더러 입력 계약 (Interface Contract)

> `encode(name) → Seed → buildModel(seed, options) → LogogramModel`
> 이 문서는 후속 렌더러 3종(SVG / Canvas 2D / WebGL)의 **단일 입력 계약**이다.
> 렌더러는 이 문서에 정의된 필드만 읽는다. 모델에는 렌더링 관심사(path, 색상,
> 질감, 애니메이션)가 전혀 없다 — 기하·구조만 담는다.
> 수치 범위의 근거: `docs/heptapod-b-encoder/03-visual-direction.md` §1.2 (F1~F8), §1.3 (S1~S4).

## 0. 공통 규약

| 항목 | 규약 |
|------|------|
| 길이 단위 | **R** — 기준 링 반지름 `ring.radius = 1`로 정규화. 렌더러는 자신의 픽셀 스케일을 곱해 사용 |
| 각도 단위 | **radian**, `[0, 2π)` 정규화 |
| 각도 기준 | `0` = 3시 방향(+x), **시계 방향 증가** (화면 좌표 y-down 기준). 12시 = `3π/2`(= `-π/2` 정규화) |
| 슬롯 배치 | 슬롯 0 = 12시, 시계 방향으로 30°(π/6)씩 12개 |
| 결정론 | 같은 `(name, options)` → 항상 동일한 모델 (deep equal). `Math.random`/`Date.now` 미사용 |
| 직렬화 | 모델은 순수 JSON 데이터 (함수·클래스 없음). `JSON.stringify` 왕복 안전 |

## 1. 전체 스키마

```jsonc
{
  "meta": {
    "name": "김민준",          // 원본 입력 문자열
    "hash": 1136963397,        // xmur3 32bit unsigned 해시
    "hashHex": "43C42345",     // 해시 16진 표기 (데이터 리드아웃용)
    "nfdCount": 9,             // NFD 자모 유닛 수 (공백 제외)
    "branchCount": 9,          // 가지 개수 = clamp(nfdCount, 3, 9)  [S1/S4]
    "clusterCount": 3          // 인접 활성 슬롯 그룹 수 (1~6 자동 보장)  [F4]
  },

  "ring": {
    "radius": 1,               // 항상 1 (R 정규화 기준)
    "ellipticity": 0.957,      // 타원율 0.92~1.00 — 단축/장축 비  [F1]
    "harmonics": [             // 반지름 변조: r(θ) = R·(1 + Σ amp·sin(k·θ + phase))
      { "k": 1, "amp": 0.051, "phase": 2.094 },   // amp ∈ [0.03, 0.08]  [F1]
      { "k": 2, "amp": 0.067, "phase": 0.411 },
      { "k": 3, "amp": 0.034, "phase": 5.882 },
      { "k": 5, "amp": 0.072, "phase": 3.107 }
    ],
    "strokeWidth": {           // 폭(θ) = clamp(base + (peak-base)·exp(-Δθ²/2σ²), min, peak)  [F2]
      "min": 0.02,             // 최세 폭 (상수)
      "base": 0.048,           // 평균 폭 0.04~0.06
      "peak": 0.231,           // 잉크 응집부 폭 0.15~0.30
      "peakAngle": 4.515,      // 응집 중심 = weightCenterAngle
      "peakSigma": 0.52        // 가우시안 응집 폭 (rad) 0.35~0.75
    },
    "strands": {               // 멀티 스트랜드 — 링을 N개 오프셋 패스로 중첩  [F3]
      "count": 3,              // 1~4 가닥
      "separation": 0.06,      // 가닥 간 이격 0~0.10R (count=1이면 0)
      "phaseOffsets": [0, 1.83, 4.27]  // 가닥별 하모닉 위상 어긋남 (첫 가닥은 항상 0)
    },
    "gap": {                   // 링 개구부 변종 — 출현 확률 ≈ 3%  [F7]
      "isOpen": false,         // true면 angle 중심으로 width만큼 링 결락
      "angle": 0,              // 개구 중심 각도 (isOpen=false면 0)
      "width": 0               // 개구 폭 (rad), 최대 π/3 (60°)
    },
    "weightCenterAngle": 4.515 // 잉크 무게중심 각도 — 12시 부근 빈도 높음  [F4]
  },

  "slots": [                   // 항상 12개 고정
    {
      "index": 0,              // 0~11
      "angle": 4.712,          // 슬롯 중심 각도 (12시 = slot 0)
      "active": true,          // 가지 배치 여부 — 시드로 비대칭 선택  [S3]
      "branchIndex": 0         // 활성 시 branches[] 인덱스, 비활성이면 null
    }
    // ... × 12
  ],

  "branches": [                // 길이 = meta.branchCount (3~9)
    {
      "index": 0,
      "slotIndex": 0,          // 소속 슬롯
      "jamo": "ᄀ",            // 이 가지를 결정한 NFD 자모 (빈 입력 폴백 시 null)
      "code": 4352,            // 자모 코드포인트
      "type": "wisp",          // code % 4 → 'wisp'|'hook'|'blob'|'spike'  [S2]
      "angle": 4.671,          // 최종 각도 = 슬롯 중심 + angleJitter
      "direction": "out",      // 'in'|'out' — 안:밖 ≈ 2:8  [F5]
      "length": 0.27,          // 0.10~0.40R — 기조는 자모, 지터는 시드  [F5/S2]
      "curl": -0.41,           // -1~1 — 휘는 정도·방향. 기조는 자모  [S2]
      "widthMul": 1.12,        // 0.6~1.4 — ring.strokeWidth.base 대비 배율
      "angleJitter": -0.041,   // 슬롯 중심 대비 지터 (±9° 이내)
      "droplet": {             // 말단 잉크 고임. 없으면 null  [F6]
        "diameter": 0.18       // blob 타입: 0.12~0.35R / 그 외: 0.03~0.10R
      },
      "isEscapeLoop": false,   // F8 — wisp 특수 변종. 링을 벗어나는 느슨한 루프
      "escapeLoopLength": 0    // isEscapeLoop=true일 때 0.3~0.6R, 아니면 0
    }
    // ... × branchCount
  ],

  "clusters": [                // 인접 활성 슬롯 그룹 (분석 오버레이·F4 검증용)
    {
      "slotIndices": [11, 0, 1],  // 원형 인접 순서의 슬롯 인덱스
      "centerAngle": 4.712        // 그룹의 원형 평균 각도
    }
    // ... 1~6개
  ],

  "splatter": [                // 위성 비산점 — 무게중심 주변 가우시안 산포  [F6]
    {
      "angle": 4.301,          // 중심 기준 방위각
      "distance": 1.08,        // 중심으로부터 거리 0.75~1.35R
      "diameter": 0.022        // 0.01~0.03R
    }
    // ... × 5~15
  ],

  "questionHook": null         // options.questionHook=false면 null. 아래 §2 참조
}
```

## 2. questionHook (의문형 갈고리)

`buildModel(seed, { questionHook: true })`일 때만 객체, 아니면 `null`.
**분리된 시드 스트림('hook')에서 생성되므로 토글 여부와 무관하게 본체
(ring/slots/branches/clusters/splatter)는 deep-equal로 동일하다** — 절대 조건.

```jsonc
{
  "angle": 1.93,     // 갈고리 부착 방위각 [0, 2π)
  "length": 0.24,    // 0.15~0.35R
  "curl": -0.78,     // ±0.5~1.0 (부호 = 감김 방향)
  "widthMul": 0.94   // 0.8~1.2 — ring.strokeWidth.base 대비 배율
}
```

## 3. 렌더러 해석 가이드

### 3.1 링 외곽선

```
r(θ) = radius · scale(θ) · (1 + Σᵢ harmonics[i].amp · sin(harmonics[i].k · θ + harmonics[i].phase))
scale(θ): ellipticity를 단축에 적용한 타원 보정 (장축 방향은 렌더러 재량, 권장: weightCenterAngle 수직)
```

- 폭: `strokeWidth` 공식(§1 주석)으로 θ별 가변 굵기 리본 생성
- `strands.count > 1`이면 같은 링을 `separation` 간격 오프셋 + `phaseOffsets[i]`를
  하모닉 phase에 더해 N겹 중첩 (느슨한 꼬임)
- `gap.isOpen`이면 `[gap.angle - gap.width/2, gap.angle + gap.width/2]` 구간 결락

### 3.2 가지 (branch)

- 시작점: 링 위 `branch.angle` 위치
- 방향: `direction === 'out'`이면 바깥 방사, `'in'`이면 중심 방향
- `length` 만큼 연장, `curl`로 곡률 부여 (부호 = 좌/우 휨)
- 유형별 권장 형상 — wisp: 가는 흩날림 / hook: 말단 갈고리 / blob: 두꺼운 고임 / spike: 직선 가시
- `isEscapeLoop`: 링에서 벗어나 `escapeLoopLength` 길이의 느슨한 폐곡선 (HUMAN 좌측 참조)

### 3.3 분석 오버레이 매핑

| 리드아웃 항목 | 모델 필드 |
|---------------|-----------|
| SEED | `meta.hashHex` |
| NFD UNITS | `meta.nfdCount` |
| ACTIVE SEGMENTS | `meta.branchCount` (= active slot 수) |
| WEIGHT CENTER | `ring.weightCenterAngle` (deg 변환은 표시 계층에서) |
| SLOT STATES | `slots[].active` 12비트 패턴 |
| TYPE CODES | `branches[].type` 시퀀스 |

## 4. 불변 조건 (렌더러가 신뢰해도 되는 것)

1. `slots.length === 12`, 활성 슬롯 수 `=== branches.length === meta.branchCount ∈ [3, 9]`
2. 모든 파라미터가 위 표기 범위 내 (verify.mjs가 회귀 검증)
3. 한 슬롯에는 최대 1개 가지 (branchIndex 유일)
4. `questionHook` 토글은 본체 필드에 영향 없음
5. 같은 이름 → 항상 같은 모델 (URL 공유 재현의 근거)
