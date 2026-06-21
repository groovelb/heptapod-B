/**
 * 프로젝트 룰 관계 데이터 (자동 생성)
 *
 * 이 파일은 scripts/generate-rules.js 에 의해 자동 생성됩니다.
 * 직접 수정하지 마세요. 수정이 필요하면 스크립트를 수정하세요.
 *
 * 생성: pnpm generate-rules
 * 생성일: 2026-06-12
 */

export const priorityMeta = {
  root: { color: '#000000', label: 'Root', order: 0 },
  CRITICAL: { color: '#D32F2F', label: '절대 위반 불가', order: 1 },
  MUST: { color: '#ED6C02', label: '반드시 준수', order: 2 },
  SHOULD: { color: '#0288D1', label: '관련 작업 시 준수', order: 3 },
  Skill: { color: '#7B1FA2', label: 'Skill (의도 기반 활성화)', order: 4 },
  'Skill Resource': { color: '#9E9E9E', label: 'Skill Resource (on-demand)', order: 5 },
};

export const ruleNodes = [
  {
    "id": "claude-md",
    "name": "CLAUDE.md",
    "priority": "root",
    "path": "CLAUDE.md",
    "description": "프로젝트 규칙 진입점 (라우터 역할)"
  },
  {
    "id": "code-convention",
    "name": "code-convention.md",
    "priority": "MUST",
    "path": ".claude/rules/code-convention.md",
    "description": "JavaScript + React.js 코드 작성 규칙"
  },
  {
    "id": "design-system",
    "name": "design-system.md",
    "priority": "MUST",
    "path": ".claude/rules/design-system.md",
    "description": "새로운 컴포넌트를 만들기 전에 반드시 기존 컴포넌트로 대체 가능한지 확인하고, 가능하면 최대한 재활용해라. 불필요한 중복 컴포넌트 생성을 피해야 함."
  },
  {
    "id": "directory-structure",
    "name": "directory-structure.md",
    "priority": "MUST",
    "path": ".claude/rules/directory-structure.md",
    "description": "파일/컴포넌트 생성 시 반드시 아래 구조를 따른다."
  },
  {
    "id": "mui-grid-usage",
    "name": "mui-grid-usage.md",
    "priority": "CRITICAL",
    "path": ".claude/rules/mui-grid-usage.md",
    "description": "```jsx"
  },
  {
    "id": "component-work",
    "name": "component-work (Skill)",
    "priority": "Skill",
    "path": ".claude/skills/component-work/SKILL.md",
    "description": "ALWAYS invoke this skill when files under src/components/ are created, modified, or deleted. Do not edit component files directly — use this skill first. Also trigger for any story file (.stories.jsx) work. Manages component taxonomy, design tokens, and interactive patterns for MUI-based design system."
  },
  {
    "id": "component-work--components",
    "name": "components.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/component-work/resources/components.md",
    "description": "Vibe Dictionary 텍소노미 v0.4 기반 분류. 번호는 텍소노미 카테고리 번호."
  },
  {
    "id": "component-work--interactive-principles",
    "name": "interactive-principles.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/component-work/resources/interactive-principles.md",
    "description": "> 기존 디자인 시스템 위에서 인터랙티브 컴포넌트 설계 시 따라야 할 원칙"
  },
  {
    "id": "component-work--mui-theme",
    "name": "mui-theme.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/component-work/resources/mui-theme.md",
    "description": "MUI 커스텀 테마 설정 규칙"
  },
  {
    "id": "component-work--project-summary",
    "name": "project-summary.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/component-work/resources/project-summary.md",
    "description": "**Starter Kit Basic**은 React + MUI + Storybook 환경을 디자이너에게 마치 디자인 툴처럼 사용할 수 있도록 도와주는 개발 환경입니다."
  },
  {
    "id": "component-work--refactoring-guide",
    "name": "refactoring-guide.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/component-work/resources/refactoring-guide.md",
    "description": "> 리팩토링 작업 시 준수해야 할 가이드."
  },
  {
    "id": "component-work--storybook-writing",
    "name": "storybook-writing.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/component-work/resources/storybook-writing.md",
    "description": "Storybook 스토리 작성 시 준수해야 할 규칙"
  },
  {
    "id": "component-work--taxonomy-index",
    "name": "taxonomy-index.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/component-work/resources/taxonomy-index.md",
    "description": "> 전체 분류체계 빠른 참조용 인덱스"
  },
  {
    "id": "component-work--taxonomy-v0-4",
    "name": "taxonomy-v0.4.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/component-work/resources/taxonomy-v0.4.md",
    "description": "---"
  },
  {
    "id": "convert-external",
    "name": "convert-external (Skill)",
    "priority": "Skill",
    "path": ".claude/skills/convert-external/SKILL.md",
    "description": "Converts external code (TypeScript, Tailwind, styled-components) into project-compliant MUI sx-based JSX components. Handles type removal, style migration, and taxonomy classification."
  },
  {
    "id": "convert-external--conversion-checklist",
    "name": "conversion-checklist.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/convert-external/resources/conversion-checklist.md",
    "description": "> 외부 코드 분석 시 감지해야 할 항목과 변환 규칙"
  },
  {
    "id": "project-planning",
    "name": "project-planning (Skill)",
    "priority": "Skill",
    "path": ".claude/skills/project-planning/SKILL.md",
    "description": "Creates structured planning documents (project-summary, ux-flow, visual-direction) in docs/ for new feature or project initiatives."
  },
  {
    "id": "project-planning--doc-templates",
    "name": "doc-templates.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/project-planning/resources/doc-templates.md",
    "description": "> 각 Phase에서 문서 작성 시 이 템플릿의 구조를 따른다."
  },
  {
    "id": "rule-visualization",
    "name": "rule-visualization (Skill)",
    "priority": "Skill",
    "path": ".claude/skills/rule-visualization/SKILL.md",
    "description": "Syncs ruleRelationships.js data with actual .claude/ file structure and updates Storybook rule visualization. Run pnpm generate-rules instead for automated sync."
  },
  {
    "id": "skill-creator",
    "name": "skill-creator (Skill)",
    "priority": "Skill",
    "path": ".claude/skills/skill-creator/SKILL.md",
    "description": "Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill's description for better triggering accuracy."
  },
  {
    "id": "sub-agent-generator",
    "name": "sub-agent-generator (Skill)",
    "priority": "Skill",
    "path": ".claude/skills/sub-agent-generator/SKILL.md",
    "description": "사용자의 의도와 조건을 받아 Claude Code subagent 파일(.claude/agents/<name>.md)을 자동 생성한다. \"subagent를 만들어줘\", \"에이전트 하나 만들자\", \"이 작업을 자동 위임하고 싶다\"는 요청이 나오면 PROACTIVELY 사용한다. .claude/agents/에 직접 파일을 쓰기 전에 MUST BE USED."
  },
  {
    "id": "supabase-integration",
    "name": "supabase-integration (Skill)",
    "priority": "Skill",
    "path": ".claude/skills/supabase-integration/SKILL.md",
    "description": "Reads ux-flow's Entity ID Dictionary as the single input and produces data-bridge (main) plus appendix-* (db-schema / auth-design / rls-policies / api-integration / edge-functions). Read-only on ux-flow. Implementation constraints are reported back to the user, who must update ux-flow via /project-planning."
  },
  {
    "id": "supabase-integration--auth-flows",
    "name": "auth-flows.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/supabase-integration/resources/auth-flows.md",
    "description": "Phase 2, 4에서 참조. Email+Password 표준 플로우 + OAuth 확장 가이드."
  },
  {
    "id": "supabase-integration--client-templates",
    "name": "client-templates.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/supabase-integration/resources/client-templates.md",
    "description": "Phase 4에서 참조. 이 템플릿을 그대로 복사해 프로젝트에 맞게 엔티티명만 바꾼다."
  },
  {
    "id": "supabase-integration--doc-templates",
    "name": "doc-templates.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/supabase-integration/resources/doc-templates.md",
    "description": "Phase 0.5 ~ 6 에서 산출할 문서 템플릿. 본문 1종 (`04-data-bridge.md`) + 부록 5종 (`appendix-*.md`)."
  },
  {
    "id": "supabase-integration--edge-functions",
    "name": "edge-functions.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/supabase-integration/resources/edge-functions.md",
    "description": "> **핵심 원칙**: 외부 API(OpenAI, Stripe, 카카오, 결제, SMS 등)는 **로컬에서 기능을 먼저 검증**한 뒤, 검증이 끝나면 **Edge Function으로 반드시 옮긴다**. 프론트 번들에 비밀 키가 남으면 안 된다."
  },
  {
    "id": "supabase-integration--error-catalog",
    "name": "error-catalog.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/supabase-integration/resources/error-catalog.md",
    "description": "Phase 4에서 `src/utils/errorMessages.js` 생성 시 사용. Supabase 에러 코드/메시지를 한국어로 매핑."
  },
  {
    "id": "supabase-integration--mcp-cli-playbook",
    "name": "mcp-cli-playbook.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/supabase-integration/resources/mcp-cli-playbook.md",
    "description": "전 Phase에서 참조. Supabase MCP 서버와 Supabase CLI의 역할 분담 규칙."
  },
  {
    "id": "supabase-integration--rls-patterns",
    "name": "rls-patterns.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/supabase-integration/resources/rls-patterns.md",
    "description": "Phase 3에서 참조. 사용자 답변을 아래 패턴 중 하나에 매핑한다."
  },
  {
    "id": "supabase-integration--schema-patterns",
    "name": "schema-patterns.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/supabase-integration/resources/schema-patterns.md",
    "description": "Phase 1에서 반드시 참조. 모든 테이블에 공통 적용할 규칙과, 자주 쓰이는 엔티티 스키마 템플릿."
  },
  {
    "id": "supabase-integration--storybook-mock",
    "name": "storybook-mock.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/supabase-integration/resources/storybook-mock.md",
    "description": "Phase 4에서 참조. 데이터 훅이 Supabase 서버를 실제로 호출하지 않도록 mock 주입."
  },
  {
    "id": "supabase-integration--trigger-patterns",
    "name": "trigger-patterns.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/supabase-integration/resources/trigger-patterns.md",
    "description": "Phase 1, 2에서 참조. 반드시 생성해야 하는 트리거 템플릿."
  },
  {
    "id": "supabase-integration--verification-checklist",
    "name": "verification-checklist.md",
    "priority": "Skill Resource",
    "path": ".claude/skills/supabase-integration/resources/verification-checklist.md",
    "description": "Phase 3(RLS 검증), Phase 5(최종 검증), Phase 6(Edge Functions)에서 실행."
  },
  {
    "id": "visual-asset-prompt",
    "name": "visual-asset-prompt (Skill)",
    "priority": "Skill",
    "path": ".claude/skills/visual-asset-prompt/SKILL.md",
    "description": "막연한 비주얼 의도를 생성용 프롬프트로 재구성한다. 핵심은 Asset Template, 즉 FORMAT(비율·구도·배경·오브젝트 크기·프레임·여백)을 패턴으로 먼저 고정하고, 그 안에서 LOOK(매체·선·톤·색)을 잡은 뒤, SUBJECT만 가변으로 둔다. 시리즈는 FORMAT+LOOK 을 동결하고 마스터 이미지를 레퍼런스로 고정한 채 SUBJECT 만 순회한다. 먼저 호출 환경을 조사해 가용 생성기(Nano Banana / GPT)에 맞춰 최적화한다. 사용자가 명시한 제약(배경·색·매체·비율)은 잠그고 덮어쓰지 않는다. \"이런 느낌 이미지/일러스트/히어로/썸네일/다이어그램/3D/배경 만들어줘\", \"비주얼 프롬프트 짜줘\", \"메뉴 일러스트 시리즈\", \"/visual-asset\" 류 요청에 사용. 이미지를 직접 생성하지는 않고 spec 까지 만든 뒤 적합한 생성 스킬로 인계한다."
  }
];

export const edgeTypes = {
  loads: { label: '자동 로드', style: 'solid' },
  references: { label: '텍스트 참조', style: 'dashed' },
  conditional: { label: '조건부 참조', style: 'dotted' },
  activates: { label: '의도 기반 활성화', style: 'solid' },
  resources: { label: 'on-demand Read', style: 'dashed' },
};

export const ruleEdges = [
  {
    "from": "claude-md",
    "to": "code-convention",
    "type": "loads"
  },
  {
    "from": "claude-md",
    "to": "design-system",
    "type": "loads"
  },
  {
    "from": "claude-md",
    "to": "directory-structure",
    "type": "loads"
  },
  {
    "from": "claude-md",
    "to": "mui-grid-usage",
    "type": "loads"
  },
  {
    "from": "claude-md",
    "to": "component-work",
    "type": "activates",
    "note": ""
  },
  {
    "from": "component-work",
    "to": "component-work--components",
    "type": "resources",
    "note": ""
  },
  {
    "from": "component-work",
    "to": "component-work--interactive-principles",
    "type": "resources",
    "note": ""
  },
  {
    "from": "component-work",
    "to": "component-work--mui-theme",
    "type": "resources",
    "note": ""
  },
  {
    "from": "component-work",
    "to": "component-work--project-summary",
    "type": "resources",
    "note": ""
  },
  {
    "from": "component-work",
    "to": "component-work--refactoring-guide",
    "type": "resources",
    "note": ""
  },
  {
    "from": "component-work",
    "to": "component-work--storybook-writing",
    "type": "resources",
    "note": ""
  },
  {
    "from": "component-work",
    "to": "component-work--taxonomy-index",
    "type": "resources",
    "note": ""
  },
  {
    "from": "component-work",
    "to": "component-work--taxonomy-v0-4",
    "type": "resources",
    "note": ""
  },
  {
    "from": "claude-md",
    "to": "convert-external",
    "type": "activates",
    "note": ""
  },
  {
    "from": "convert-external",
    "to": "convert-external--conversion-checklist",
    "type": "resources",
    "note": ""
  },
  {
    "from": "claude-md",
    "to": "project-planning",
    "type": "activates",
    "note": ""
  },
  {
    "from": "project-planning",
    "to": "project-planning--doc-templates",
    "type": "resources",
    "note": ""
  },
  {
    "from": "claude-md",
    "to": "rule-visualization",
    "type": "activates",
    "note": ""
  },
  {
    "from": "claude-md",
    "to": "skill-creator",
    "type": "activates",
    "note": ""
  },
  {
    "from": "claude-md",
    "to": "sub-agent-generator",
    "type": "activates",
    "note": ""
  },
  {
    "from": "claude-md",
    "to": "supabase-integration",
    "type": "activates",
    "note": ""
  },
  {
    "from": "supabase-integration",
    "to": "supabase-integration--auth-flows",
    "type": "resources",
    "note": ""
  },
  {
    "from": "supabase-integration",
    "to": "supabase-integration--client-templates",
    "type": "resources",
    "note": ""
  },
  {
    "from": "supabase-integration",
    "to": "supabase-integration--doc-templates",
    "type": "resources",
    "note": ""
  },
  {
    "from": "supabase-integration",
    "to": "supabase-integration--edge-functions",
    "type": "resources",
    "note": ""
  },
  {
    "from": "supabase-integration",
    "to": "supabase-integration--error-catalog",
    "type": "resources",
    "note": ""
  },
  {
    "from": "supabase-integration",
    "to": "supabase-integration--mcp-cli-playbook",
    "type": "resources",
    "note": ""
  },
  {
    "from": "supabase-integration",
    "to": "supabase-integration--rls-patterns",
    "type": "resources",
    "note": ""
  },
  {
    "from": "supabase-integration",
    "to": "supabase-integration--schema-patterns",
    "type": "resources",
    "note": ""
  },
  {
    "from": "supabase-integration",
    "to": "supabase-integration--storybook-mock",
    "type": "resources",
    "note": ""
  },
  {
    "from": "supabase-integration",
    "to": "supabase-integration--trigger-patterns",
    "type": "resources",
    "note": ""
  },
  {
    "from": "supabase-integration",
    "to": "supabase-integration--verification-checklist",
    "type": "resources",
    "note": ""
  },
  {
    "from": "claude-md",
    "to": "visual-asset-prompt",
    "type": "activates",
    "note": ""
  }
];

export const conditionMatrix = [
  {
    "task": "컴포넌트 생성",
    "rules": [
      "code-convention",
      "design-system"
    ],
    "skill": "component-work",
    "skillResources": [
      "component-work--taxonomy-index",
      "component-work--storybook-writing"
    ]
  },
  {
    "task": "컴포넌트 수정",
    "rules": [
      "code-convention",
      "design-system"
    ],
    "skill": "component-work",
    "skillResources": [
      "component-work--storybook-writing"
    ]
  },
  {
    "task": "컴포넌트 삭제",
    "rules": [],
    "skill": "component-work"
  },
  {
    "task": "인터랙티브 컴포넌트",
    "rules": [
      "code-convention",
      "design-system"
    ],
    "skill": "component-work",
    "skillResources": [
      "component-work--taxonomy-index",
      "component-work--interactive-principles",
      "component-work--storybook-writing"
    ]
  },
  {
    "task": "스토리 작성/수정",
    "rules": [],
    "skill": "component-work",
    "skillResources": [
      "component-work--storybook-writing"
    ]
  },
  {
    "task": "외부 코드 변환",
    "rules": [
      "code-convention",
      "design-system"
    ],
    "skill": "convert-external",
    "skillResources": [
      "convert-external--conversion-checklist"
    ]
  },
  {
    "task": "리팩토링",
    "rules": [
      "code-convention"
    ],
    "skill": "component-work",
    "skillResources": [
      "component-work--refactoring-guide"
    ]
  },
  {
    "task": "테마/스타일 수정",
    "rules": [
      "design-system"
    ],
    "skillResources": [
      "component-work--mui-theme"
    ]
  },
  {
    "task": "Grid 사용",
    "rules": [
      "mui-grid-usage"
    ]
  }
];
