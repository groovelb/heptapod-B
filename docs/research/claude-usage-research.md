# Claude Code skills, hooks, and sub-agents in real-world web development

**Claude Code's extensibility system — skills, hooks, and sub-agents — has moved from experimental to production-ready between December 2025 and March 2026, with documented adoption across design system building, component library management, and full-stack web development.** The ecosystem now includes 60,000+ published skills, official integrations from shadcn/ui and Storybook, and a bidirectional Figma-to-code pipeline announced in February 2026. What follows is a grounded inventory of real, documented cases — not theoretical capabilities — drawn from GitHub repositories, engineering blogs, community discussions, and official Anthropic sources.

---

## Skills have become the design system's single source of truth

Skills are filesystem-based resources (a `SKILL.md` file plus optional scripts and reference files) that give Claude domain-specific expertise. In the local CLI, they live at `.claude/skills/[skill-name]/SKILL.md`; in Claude.ai's cloud VM, at `/mnt/skills/public/`. The key distinction: CLAUDE.md instructions are advisory and can be ignored; skills provide structured, on-demand context that Claude loads when relevant tasks arise.

**Anthropic's official `frontend-design` skill** is the most widely adopted, with **277,000+ installs** as of March 2026. It was built specifically to combat what the Applied AI team calls "distributional convergence" — the tendency of AI-generated UIs to default to Inter fonts, purple gradients, and generic card layouts. The ~400-token skill prompt forces Claude to reason through four dimensions before writing code: purpose, tone, constraints, and differentiation. Before/after comparisons published in Anthropic's November 2025 blog post show measurable improvements on SaaS landing pages, blog layouts, and admin dashboards.

The most significant real-world skill integration is **shadcn/ui's first-party skill**, installable via `npx skills add shadcn/ui`. This reads the project's `components.json` and runs `shadcn info --json` on every interaction, giving Claude real-time awareness of the framework version, Tailwind configuration, installed components, and file aliases. Combined with shadcn's MCP server (live component docs) and Presets system (bundled design tokens), this creates a three-layer context stack. shadcn/ui CLI v4, released March 2026, was explicitly described by its creators as **"built for you and your coding agents."**

Several community repositories demonstrate production-level skill authoring for web development:

- **jezweb/claude-skills** includes a Next.js 16 skill covering App Router, `"use cache"` directive, and Server Components, claiming 65–70% token savings and 18+ error categories prevented. Updated January 2026.
- **secondsky/claude-skills** offers 167 production-ready skills including `tailwind-v4-shadcn`, `tanstack-start`, and `hono-api-scaffolder`.
- **blencorp/claude-code-kit** provides auto-activating skills with framework detection — run `npx claude-code-setup --kit tailwindcss` and get a full Tailwind v4 skill with `@theme` directive support, OKLCH colors, and dark mode patterns.
- **julianromli/ai-skills** includes a `vibe-cloner` skill that scrapes existing websites via Firecrawl MCP and extracts design tokens in a three-phase workflow (Scrape → Analysis → Code Generation).

A particularly instructive real-world walkthrough comes from nathanonn.com, where a developer extracted design tokens from existing HTML files, packaged the design system as a Claude Skill using the `skill-creator` meta-skill, then used it to redesign all **47 components** consistently. The skill enforced spacing scales, color tokens, shadows, and border radii across every generated component.

For designers specifically, Marie Claire Dean published **63 design skills and 27 commands** organized into 8 plugins covering research, systems, strategy, UI, interaction design, prototyping, design ops, and toolkit. The `/handoff` command generates a complete developer handoff package with measurements, behaviors, edge cases, and QA checklists.

---

## Hooks enforce what CLAUDE.md cannot guarantee

The most repeated insight across community discussions is this: **skills are probabilistic; hooks are deterministic.** While CLAUDE.md instructions can be ignored (a frequent complaint on r/ClaudeAI), hooks are shell commands that execute every time their lifecycle event fires. Claude Code now supports **14 lifecycle events** and **3 handler types** (command, prompt, and agent).

**Auto-formatting with Prettier is the single most common hook**, appearing in nearly every guide and real configuration. The canonical pattern is a PostToolUse hook on `Edit|Write` that pipes the file path to Prettier:

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

Boris Cherny, the creator of Claude Code, confirmed in a February 2026 Threads post that he uses this exact pattern: a PostToolUse hook to format code, which he says **"handles the last 10% to avoid formatting errors in CI."** He also uses a Stop hook with a background agent to verify work deterministically on long-running tasks.

The most compelling production case study comes from **Liam ERD** (github.com/liam-hq/liam), an open-source database design tool. Their team discovered that Claude Code would skip project-wide linting, dismissing failures as "unrelated." Their solution combined Lefthook pre-commit hooks running `pnpm lint` with Claude Code permission settings that deny `git commit --no-verify:*`. The blog post (last edited December 2025) includes full configuration files and describes the iterative process of getting enforcement right.

**GitButler** provides a documented product integration using three hook events to automatically isolate changes from multiple concurrent Claude Code sessions into separate branches. Their PreToolUse, PostToolUse, and Stop hooks call `but claude pre-tool`, `but claude post-tool`, and `but claude stop` respectively, enabling parallel agent workflows without merge conflicts.

Other real, documented hook configurations include:

- **Trail of Bits** (security firm): PreToolUse hooks that block `rm -rf` (suggests trash instead) and direct pushes to main/master. Open-sourced at github.com/trailofbits/claude-code-config.
- **Cameron Westland's blog**: A branch protection hook that returns structured JSON with guidance on using feature branches, plus a TypeScript + ESLint quality hook on `Write|Edit|MultiEdit` that runs `npx tsc --noEmit` and `yarn lint:fix`.
- **@juanpprieto/claude-lsp**: An npm package that runs a background LSP daemon, using SessionStart/PostToolUse/SessionEnd hooks to provide continuous TypeScript, ESLint, Prettier, and GraphQL diagnostics injected as context.
- **TDD Guard** by Nizar Selander: PreToolUse hooks intercepting Write/Edit/MultiEdit operations to enforce test-first development across JavaScript, Python, PHP, Go, and Rust. The author candidly notes the agent sometimes *appeared* to follow TDD because context was "TDD-saturated," not because enforcement actually worked — an important finding about hook limitations.

A Reddit power user (u/JokeGold5455) documented a comprehensive infrastructure with **5 skills, 6 hooks, 10 agents, and 3 slash commands**, including a UserPromptSubmit hook that injects a "SKILL ACTIVATION CHECK" prompt to force Claude to check for relevant skills before acting — a workaround for the known issue that skill auto-activation remains unreliable. The full infrastructure is open-sourced at github.com/diet103/claude-code-infrastructure-showcase.

---

## Sub-agents enable parallel design system operations

Claude Code's sub-agent system (renamed from "Task tool" to "Agent" in v2.1.63) allows spawning up to **10 concurrent specialized agents**, each with their own context window, system prompt, and tool access. Agent Teams, released February 5, 2026 as a Research Preview with Opus 4.6, goes further — multiple full Claude Code instances work in parallel on a shared codebase with peer-to-peer messaging.

The flagship demonstration is **Anthropic's C compiler project** (February 2026): 16 parallel Claude agents built a Rust-based C compiler that compiles Linux 6.9 across x86, ARM, and RISC-V. The project consumed ~2,000 sessions, **2 billion input tokens**, 140 million output tokens, and ~$20K, producing 100,000 lines of code. Each agent ran in a Docker container with a shared bare git repo, claiming tasks via file-based locking.

For web development specifically, the most detailed documented workflow comes from **Zach Wills**, who built a `/add-linear-ticket` command that spawns three specialist sub-agents in parallel: a `product-manager` (defines user stories), a `ux-designer` (proposes user flows reusing existing components), and a `senior-software-engineer` (writes technical specifications). These run simultaneously to generate a fully-formed Linear ticket in minutes. Implementation then proceeds through a `senior-software-engineer` agent (on Opus) with iterative `code-reviewer` feedback loops. For large-scale refactoring, Wills documents a pattern: "To deprecate a function used in 75 files, have a primary agent grep for all instances, then spin up a dedicated sub-agent for each file."

**PubNub** documented a production three-stage sub-agent pipeline: `pm-spec` (reads enhancement, writes working spec) → `architect-review` (validates against platform constraints using PubNub's MCP server) → `implementer-tester` (implements code, updates docs). SubagentStop hooks chain the stages, with human-in-the-loop approval at each handoff. Their conclusion: **"Subagents + hooks turn Claude Code from a helpful AI into a repeatable engineering system."**

For design systems, **The Design Project** published a February 2026 case study where Claude Code audited cal.com's open-source repository (50+ UI components) and built a Storybook component library in a single day. Phase 2 used Claude Code to produce a component catalog: **17 simple, 20 medium, 7 complex components** organized by scope. Phase 3 built stories one-by-one with visual verification using Playwright MCP. The team discovered architectural debt like token environment mismatches and CSS hover state issues (`@media (hover: hover)` in Tailwind v4). After 3–4 components, they accumulated enough knowledge to batch-build the rest.

Alex Opalka documented a **TDD workflow with three sub-agents** for Vue.js: `tdd-test-writer` (RED — writes failing test, verifies failure), `tdd-implementer` (GREEN — minimal code to pass), and `tdd-refactorer` (REFACTOR — improves code quality). Context isolation prevents "context pollution" — the test writer genuinely doesn't know how the feature will be implemented, enforcing real test-first development.

A practical cost consideration from community discussions: sub-agents consume **4–7x more tokens** than single-agent sessions, and Agent Teams approximately **15x**. Heeki Park's candid March 2026 assessment after using Agent Teams: "For most of what I'm doing, subagents are sufficient both in terms of complexity and time."

---

## The Figma-to-code loop closed in February 2026

The most significant development for design system workflows is **Figma's "Code to Canvas" integration** announced February 17, 2026. This creates a bidirectional loop: build UI in Claude Code → type "Send this to Figma" → the live browser state is captured as fully editable Figma layers (not screenshots) → the team annotates and iterates in Figma → changes return to code via Figma MCP. Gui Seiz (Design Director for AI at Figma) and Alex Kern presented this workflow publicly.

Domingo Widen, Staff Designer at **Intercom**, described their production workflow on the Sneak Peek podcast: Figma MCP + Claude Code + Code Connect generates prototypes that deploy as PRs to GitHub. His key insight: "Every single pattern we add to the system becomes a new piece of code that designers can use to prototype" — a compounding effect where the design system grows more powerful as more components are connected. He notes this required a dedicated team, a prototyping hub, documentation, tutorials, and months of skills engineering.

**Dhika Endi Astowo** (Design Systems Collective, January 2026) documented using CLAUDE.md as a "design system constitution" for a React + TypeScript + Tailwind project with Atomic Design methodology. The file specifies the exact spacing scale (4, 8, 16, 24, 32, 48px), color tokens from `src/tokens/colors.ts`, WCAG 2.1 AA requirements, and dark mode variants. Combined with Figma MCP, the workflow runs: copy Figma link → paste into Claude Code → Claude reads CLAUDE.md → generates component with correct tokens, types, and accessibility attributes. His conclusion: "Every component Claude generates uses the same tokens, follows the same patterns, and maintains the same quality bar."

For accessibility, the **AccessLint plugin** provides WCAG 2.1 Level A/AA auditing with color contrast analysis tools, while **Community-Access/accessibility-agents** offers 57 specialized agents across 5 teams using Playwright for behavioral scanning. A December 2025 case study by Brent W. Peterson demonstrated real-world value: Claude Code found **29 Pa11y errors** on a marketing site, grouped them into 4 root patterns (not 29 individual problems), and fixed them by adjusting Tailwind color variants from -400 to -200 for WCAG 4.5:1 contrast.

The **Storybook MCP addon** (@storybook/addon-mcp) provides agents with component metadata, validated patterns, and test suites. A Codrops tutorial from December 9, 2025 walks through the full setup, and the TDP case study demonstrates it working at scale on a real 50+ component codebase.

---

## What the Korean tech community is building

Korean developers and designers are actively adopting Claude Code for web development workflows. **bear2u/my-skills** is a Korean-language skills collection including `landing-page-guide-v2` (high-conversion landing pages), `design-prompt-generator-v2`, and `nextjs15-init`. A brunch.co.kr article covers Claude Code's Figma MCP integration for Korean designers, discussing design token extraction and the visual feedback loop. TILNOTE published a practical tutorial on installing Anthropic's frontend-design skill, with an example building an AI beer curation service landing page using Next.js + shadcn/ui. Apidog's Korean blog provides a detailed technical guide on fighting "distribution convergence" through typography guidelines, theme engineering, and design token management. GeekDive Corp, a Korean agency, reports **up to 90% time reduction** on frontend development tasks after adopting Claude Code.

---

## Conclusion: what actually works today

The ecosystem has crossed a threshold. Three patterns reliably deliver results in production web development:

**First, the skills-as-design-system pattern works.** Encoding your design tokens, component conventions, and coding standards into SKILL.md files — combined with shadcn/ui's official skill and Storybook MCP — produces consistent, design-system-compliant components. The community consensus is that CLAUDE.md should stay under 200 lines, with progressive disclosure via separate skills for specific domains.

**Second, hooks solve the enforcement problem.** The Prettier PostToolUse hook is table stakes. Branch protection, TypeScript type-checking, and lint enforcement via hooks give you guarantees that CLAUDE.md instructions alone cannot provide. The Liam ERD case study is the clearest proof: without hooks, Claude skipped linting; with hooks, it couldn't.

**Third, sub-agents are powerful but expensive.** The PM/UX/Engineer trio pattern (Zach Wills), the spec→architecture→implementation pipeline (PubNub), and the TDD Red-Green-Refactor cycle (Alex Opalka) are the most proven sub-agent patterns. But at 4–7x token cost and with known issues around over-spawning, most practitioners use sub-agents selectively for complex or parallelizable tasks rather than as a default workflow.

The gap worth noting: **skill auto-activation remains unreliable.** Claude frequently handles tasks in the main session rather than delegating to matching agents. The community workaround — a UserPromptSubmit hook that forces a skill activation check — highlights that the infrastructure is still maturing. For a UX/UI designer teaching vibe coding, the honest framing is: this tooling works well when you invest in setting it up correctly, but it requires understanding the system's constraints, not just its capabilities.