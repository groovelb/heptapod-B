# Vibe Design Starter Kit v1.0

바이브 코딩으로 **예측 가능하고 퀄리티 높은 UI**를 만들기 위한 스타터킷.
디자인을 잘 모르는 개발자, 코딩이 처음인 디자이너 모두를 위해 설계되었습니다.

## 구성 요소

```
├── MUI 7 + React 19          UI 프레임워크 + 커스텀 테마
├── Storybook 10               컴포넌트 문서화 + 시각적 탐색
├── UI 택소노미 (207항목)       컴포넌트 분류 체계
├── Claude Code 설정            Rules + Skills + Settings
└── 50+ 컴포넌트               레이아웃, 카드, 모션, 타이포 등
```

### Storybook

컴포넌트를 시각적으로 탐색하고 Props를 조작하는 도구입니다.

```bash
pnpm storybook
```

- **Overview** — 프로젝트 소개, 룰 관계 시각화
- **Style** — 색상, 타이포, 간격, 아이콘 등 디자인 토큰
- **Component / Interactive** — UI 컴포넌트 + 인터랙티브 패턴
- **Template** — 여러 컴포넌트를 조합한 페이지 템플릿

### Claude Code 설정

Claude Code가 이 프로젝트의 규칙을 자동으로 따르도록 설정되어 있습니다.

| 구성 | 역할 |
|------|------|
| `.claude/rules/` (4파일) | 코드 컨벤션, 디자인 시스템, Grid 규칙, 디렉토리 구조 — 매 세션 자동 로드 |
| `.claude/skills/component-work/` | 컴포넌트 생성/수정/삭제 워크플로우 + 택소노미 참조 |
| `.claude/skills/convert-external/` | 외부 코드(TS, Tailwind 등)를 프로젝트 규칙에 맞게 변환 |
| `.claude/settings.json` | 권한 설정 (Read/Write/pnpm/git 허용, .env 차단) |

### 커스텀 테마

`src/styles/themes/default.js`에 정의된 디자인 토큰:

- **Primary**: Pure Blue (`#0000FF`) / **Secondary**: Blue-Grey (`#263238`)
- **Typography**: Outfit (영문) + Pretendard (한글)
- **Shape**: borderRadius 0 (플랫 디자인)
- **Elevation**: 저투명도 블러 그림자

## 시작하기

```bash
# 설치
pnpm install

# Storybook 실행
pnpm storybook

# 개발 서버
pnpm dev
```

## 내 프로젝트에 최적화하기

이 스타터킷을 실제 프로젝트에 맞게 커스터마이즈하는 방향입니다.

### 1. 테마 교체

`src/styles/themes/default.js`에서 색상, 타이포, 간격을 프로젝트 브랜드에 맞게 수정합니다. `.claude/rules/design-system.md`의 토큰 예시도 함께 업데이트하면 Claude가 새 토큰을 사용합니다.

### 2. 불필요한 컴포넌트 정리

50+ 컴포넌트 중 프로젝트에 필요한 것만 남기고 나머지를 삭제합니다. 삭제 후 `pnpm generate-rules`를 실행하면 Storybook 시각화가 자동 갱신됩니다.

### 3. Rules 조정

`.claude/rules/` 파일을 프로젝트 컨벤션에 맞게 수정합니다.

- 다른 아이콘 라이브러리 사용 → `design-system.md` 수정
- TypeScript 도입 → `code-convention.md`에 TS 규칙 추가
- 폴더 구조 변경 → `directory-structure.md` 수정

### 4. Skills 확장

프로젝트 고유 워크플로우가 있다면 `.claude/skills/`에 새 스킬을 추가합니다. 추가 후 `pnpm generate-rules`로 시각화를 갱신합니다.

### 5. Hooks 도입 (선택)

코드 포매팅 자동화가 필요하다면 Prettier PostToolUse hook을 추가할 수 있습니다.

```bash
pnpm add -D prettier
```

`.claude/settings.json`에 hook 설정 추가:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write"
      }]
    }]
  }
}
```

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | Vite 개발 서버 |
| `pnpm storybook` | Storybook 실행 (포트 6006) |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm build-storybook` | Storybook 정적 빌드 |
| `pnpm lint` | ESLint 실행 |
| `pnpm generate-rules` | `.claude/` 구조를 스캔하여 룰 시각화 데이터 재생성 |
