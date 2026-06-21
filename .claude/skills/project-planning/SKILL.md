---
name: project-planning
description: Creates structured planning documents (project-summary, ux-flow, visual-direction) in docs/ for new feature or project initiatives.
when_to_use: When user explicitly invokes /project-planning. Do not auto-activate — wait for direct user invocation.
user-invocable: true
disable-model-invocation: true
---

# Project Planning Skill

> 기획 문서(project-summary → ux-flow → visual-direction)를 순차 작성하는 워크플로우

## 활성화 조건

| 의도 | 트리거 예시 |
|------|-----------|
| 기획 시작 | "기획 문서 작성해줘", "프로젝트 계획", "새 기능 기획" |
| 개별 문서 | "project-summary 작성", "ux-flow 만들어줘", "visual-direction" |
| 이어서 작성 | "다음 단계 진행해줘", "ux-flow 이어서" |

---

## 워크플로우

### 전체 흐름

```
Phase 1          Phase 2              Phase 3
project-summary → ux-flow            → visual-direction
     │                │                    │
  [승인 게이트]    [승인 게이트]        [승인 게이트]
```

### Phase 1: project-summary

1. 사용자에게 프로젝트 목적/범위 질문
2. `resources/doc-templates.md` Read → project-summary 템플릿 확인
3. `docs/{project-name}/01-project-summary.md` 작성
   - 프로젝트명, 목적, 핵심 기능 개조식
   - 대상 사용자, 기술적 제약사항
4. **승인 게이트**: 사용자에게 요약 제시 → 수정/승인

### Phase 2: ux-flow

**Phase 1 승인 후에만 진행**

1. `docs/{project-name}/01-project-summary.md` Read (승인된 문서)
2. `resources/doc-templates.md` Read → ux-flow 템플릿 확인
3. `component-work/resources/components.md` Read → 기존 컴포넌트 확인
4. `component-work/resources/taxonomy-index.md` Read → 카테고리 매핑
5. `docs/{project-name}/02-ux-flow.md` 작성:
   - 유저 시나리오 (핵심 플로우별)
   - UX 플로우 다이어그램 (Mermaid)
   - 정보 구조 (IA)
   - 데이터 모델
   - 컴포넌트 리스트: 기존 재활용 vs 신규 필요
6. **승인 게이트**: 사용자에게 제시 → 수정/승인

### Phase 3: visual-direction

**Phase 2 승인 후에만 진행** (Phase 1만으로도 작성 가능 — 사용자 요청 시)

1. `docs/{project-name}/01-project-summary.md` Read
2. `resources/doc-templates.md` Read → visual-direction 템플릿 확인
3. `component-work/resources/mui-theme.md` Read → 현재 토큰 확인
4. `docs/{project-name}/03-visual-direction.md` 작성:
   - 디자인 토큰 커스텀 방향 (색상, 타이포, 간격)
   - 현재 테마 대비 변경 필요 사항
   - 레퍼런스 이미지/사이트 목록 (사용자 제공)
   - 톤앤매너 키워드
5. **승인 게이트**: 사용자에게 제시 → 수정/승인

### 개별 문서 직접 작성

사용자가 특정 Phase만 요청할 수 있음:
- "ux-flow만 작성해줘" → 기존 project-summary 확인 후 Phase 2 진행
- 기존 project-summary가 없으면 → Phase 1부터 시작하도록 안내

---

## Resources

| 파일 | 용도 | 언제 Read |
|------|------|----------|
| `doc-templates.md` | 3개 문서 유형 템플릿 | 각 Phase 시작 시 |

### 참조하는 외부 리소스 (복제하지 않음)

| 파일 | 위치 | 언제 Read |
|------|------|----------|
| `components.md` | `component-work/resources/` | Phase 2 (재활용성 확인) |
| `taxonomy-index.md` | `component-work/resources/` | Phase 2 (카테고리 매핑) |
| `mui-theme.md` | `component-work/resources/` | Phase 3 (현재 토큰 확인) |

---

## 핵심 원칙

- **승인 없이 다음 Phase 진행 금지** — 각 Phase는 독립적 승인 단위
- **개조식 우선** — 기획 문서는 산문보다 구조화된 목록/표 사용
- **기존 컴포넌트 재활용 우선** — ux-flow의 컴포넌트 리스트에서 반드시 기존 것 먼저 확인
- **Mermaid 다이어그램 활용** — UX 플로우, IA를 시각적으로 표현
- **레퍼런스 이미지는 사용자 제공** — Claude가 임의로 URL 생성하지 않음
