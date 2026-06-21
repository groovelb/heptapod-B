# Conversion Checklist

> 외부 코드 분석 시 감지해야 할 항목과 변환 규칙

## 스토리 예시 색상 원칙

스토리북 예시에서는 **흰/검정 시멘틱 토큰만** 사용한다. 브랜드 컬러를 쓰지 않는다.

| 용도 | 사용할 토큰 | 금지 |
|------|------------|------|
| 텍스트 | `'text.primary'`, `'text.secondary'`, `'text.disabled'` | `'primary.main'`, `#hex` |
| 배경 | `'background.default'`, `'background.paper'`, `'grey.50'`~`'grey.900'` | `'primary.light'`, `#hex` |
| 구분선 | `'divider'` | `#hex` |
| 강조 배경 | `'grey.100'`, `'grey.200'` | 브랜드 컬러 배경 |
| 반전 (다크) | `'grey.900'` + `'common.white'` | gradient, 하드코딩 hex |

컴포넌트 자체의 Props로 색상을 받는 경우, Props 기본값은 시멘틱 토큰으로 설정하되 스토리에서는 흰/검정 계열만 시연한다.

## 언어/타입 변환

| 감지 패턴 | 변환 규칙 |
|-----------|----------|
| `.tsx` 확장자 | → `.jsx`로 변환 |
| `interface Props { ... }` | → JSDoc `@param` 주석으로 대체 |
| `type Props = { ... }` | → JSDoc `@param` 주석으로 대체 |
| `React.FC<Props>` | → 일반 함수 선언 + Props 구조분해 |
| `const x: Type = ...` | → 타입 어노테이션 제거 |
| `as Type` 캐스팅 | → 제거 |
| `React.RefObject<T>` | → `useRef(null)` (제네릭 제거) |

## 스타일 변환

| 감지 패턴 | 변환 규칙 |
|-----------|----------|
| `className="..."` (Tailwind) | → MUI `sx` prop으로 변환 |
| `styled(Component)` | → MUI `sx` prop으로 변환 |
| CSS Modules `styles.xxx` | → MUI `sx` prop으로 변환 |
| 인라인 `style={{ }}` | → MUI `sx` prop으로 변환 (가능한 경우) |
| `@apply` (Tailwind CSS) | → MUI `sx` prop |

### Tailwind → sx 주요 매핑

```
fixed        → position: 'fixed'
absolute     → position: 'absolute'
relative     → position: 'relative'
inset-0      → inset: 0
w-full       → width: '100%'
h-full       → height: '100%'
flex         → display: 'flex'
items-center → alignItems: 'center'
justify-center → justifyContent: 'center'
gap-N        → gap: N (spacing 단위)
p-N          → p: N
m-N          → m: N
rounded-lg   → borderRadius: 2
text-white   → color: 'white'
bg-xxx       → backgroundColor: 'xxx'
pointer-events-none → pointerEvents: 'none'
overflow-hidden → overflow: 'hidden'
```

## Import / 의존성

| 감지 패턴 | 변환 규칙 |
|-----------|----------|
| `import ... from '../constants'` 등 | → Props로 외부화 또는 theme 토큰 사용 |
| `import Grid from '@mui/material/Grid2'` | → `'@mui/material/Grid'` (CRITICAL) |
| `from 'three'` (Three.js) | → 사용자에게 `pnpm add three` 확인 |
| `from 'framer-motion'` | → 프로젝트에 이미 설치됨, 유지 가능 |
| `from 'gsap'` | → 사용자에게 설치 확인, interactive-principles.md 참조 |
| 기타 미설치 라이브러리 | → 사용자에게 의존성 추가 여부 확인 |

## 색상 / 토큰

| 감지 패턴 | 변환 규칙 |
|-----------|----------|
| `#0000FF` 또는 유사 blue | → `'primary.main'` |
| `#263238` (blueGrey 900) | → `'secondary.main'` |
| 기타 하드코딩 #hex | → 가장 가까운 `theme.palette` 토큰, 없으면 Props로 외부화 |
| 하드코딩 px 폰트 크기 | → `theme.typography` variant 사용 |
| 하드코딩 px 간격 | → `theme.spacing` (MUI spacing 단위) |

## 코드 컨벤션 (`code-convention.md` 기준)

| 감지 패턴 | 변환 규칙 |
|-----------|----------|
| `default export` | → named export 확인 (파일당 하나) |
| Props 타입 없는 함수 | → JSDoc `@param` 주석 추가 |
| 더블 쿼트 `"string"` | → 싱글 쿼트 `'string'` |
| `sx={{...}}` (붙어있는 중괄호) | → `sx={ {...} }` (스페이싱) |
| `import` 순서 무작위 | → 외부 라이브러리 → 내부 모듈 → 스타일 |
| 세미콜론 누락 | → 세미콜론 추가 |
| indent 4칸 또는 tab | → 2칸 space |

## 구조 / 패턴

| 감지 패턴 | 변환 규칙 |
|-----------|----------|
| 하드코딩 이미지 URL | → `Placeholder.Media` 또는 `placeholderSvg()` (스토리에서) |
| `useEffect` 내 DOM 직접 조작 | → 유지 가능 (사유 주석 추가) |
| 여러 컴포넌트가 한 파일에 | → 메인 + 서브컴포넌트 패턴이면 유지, 아니면 분리 |
| Compound component (`Component.Sub`) | → 유지 가능 (프로젝트 내 선례: `HorizontalScroll.Slide`) |
| `forwardRef` 사용 | → 유지 (프로젝트 내 선례: `CardContainer`) |

## 난이도 판단 기준

| 난이도 | 조건 |
|--------|------|
| **간단** | JSX + MUI 기반, 스타일/import만 정리 |
| **보통** | TypeScript 제거 + Tailwind/styled 변환 |
| **복잡** | 외부 라이브러리 의존 + 대규모 스타일 변환 + 구조 변경 |
