import { EditorialDocument } from './EditorialDocument';

const SAMPLE_SOURCE = `# Sample Brand: Project Summary

> 이 문서가 결정하는 것: 왜 만들고, 누구를 위해, 무엇을 다루며, 어떤 과업을 이루게 하는가
> 입력: 없음 · 출력 대상: 02-ux-flow, 03-visual-direction (넘기는 항목은 이 문서 7절 표)

## 결정 현황

이 표의 확정 항목만 다음 문서가 그대로 인용한다. 잠정은 \`(잠정)\` 표시를 달고 인용하고, 미정은 인용하지 않는다.

| 섹션 | 상태 | 비고 |
|---|---|---|
| 1. 한 줄 요약 | 확정 | |
| 2. 배경과 목적 | 잠정 | 기대 효과 미확인 |
| 3. 정체성 | 미정 | 가치 후보 확인 (Q1) |

문서 상태: 잠정 승인 (하드 게이트 충족)
개정: 2026-09-16 v1 · 변경: 초안

---

## 1. 한 줄 요약

> 조명을 고르는 사람이 제품 스펙이 아니라 시간과 공간 속 빛의 상태로 제품을 만나게 하는 온라인 쇼케이스.

태그라인: Light defines the space.

---

## 2. 배경과 목적

- **문제 또는 기회**: 조명 이커머스는 스펙과 제품 컷을 나열한다. 공간에 놓였을 때의 빛은 사진 한 장으로 전달되지 않는다.
- **왜 지금, 왜 우리**: 스크롤과 시간으로 감각을 체험시키는 온라인 경험은 아직 드물다.
- **기대 효과**: 구매 전 단계에서 브랜드에 대한 신뢰가 생긴다.

---

## 3. 정체성

### 3.1 핵심 가치 (최대 3)

| 이름 | 한 줄 | 반대말 (하지 않는 태도) |
|---|---|---|
| Immanence | 빛이 공간 안에 조용히 머문다 | 존재감을 과시하는 조명 |
| Continuity | 아침의 선명함에서 저녁의 온기로 이어진다 | 급격하게 단절되는 경험 |

### 3.2 태도 키워드 (최대 5, 단어만)

차분함 · 정확함 · 건축적
`;

export default {
  title: 'Common/EditorialDocument',
  component: EditorialDocument,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '기획 문서(마크다운 원문)를 프로젝트 테마의 서체와 색으로 브랜드 북처럼 그린다. '
          + '스토리북 Docs 페이지에서 `docs/` 원본을 `?raw`로 불러와 그대로 넘긴다. '
          + '제목 번호를 라벨로 분리하고, 표는 가로 괘선만 남기며, 섹션 사이에 넉넉한 여백을 둔다.',
      },
    },
  },
  argTypes: {
    source: { control: 'text', description: '마크다운 원문' },
    maxWidth: {
      control: { type: 'number', min: 640, max: 1400, step: 40 },
      description: '본문 컨테이너 최대 폭(px)',
    },
    theme: { control: false, description: 'MUI 테마 객체 (기본값: defaultTheme)' },
  },
};

export const Default = {
  args: {
    source: SAMPLE_SOURCE,
    maxWidth: 960,
  },
};

export const NarrowColumn = {
  args: {
    source: SAMPLE_SOURCE,
    maxWidth: 720,
  },
};
