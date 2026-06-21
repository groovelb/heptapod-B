# Claude Code in Action - Raw Course Notes Archive

**Course:** Claude Code in Action  
**Instructor:** Stephen Grider (Anthropic Technical Staff)  
**Source:** https://anthropic.skilljar.com/claude-code-in-action  
**Extracted:** April 2026  
**Note:** Video subtitle transcripts + text lesson content

---

## Section 1: What is Claude Code?

### Lesson 1. Introduction
Course overview: 4 sections covering what a coding assistant is, what makes Claude Code stand out, hands-on experience, and getting the most out of Claude Code on your own projects.

### Lesson 2. What is a coding assistant?
Coding assistants work by receiving a task, passing it to a language model, which then uses tools (read files, search, run commands, write files) to solve it. The key differentiator between assistants is what tools they have access to and how well the model uses them. Claude Code operates in the terminal with full system access — it can read/write files, run commands, search code. This gives it more power than IDE-based assistants that are limited to editor APIs. Claude is particularly strong at tool use, meaning it makes smart decisions about which tools to use and when.

### Lesson 3. Claude Code in action
Demo of Claude Code's capabilities: (1) Finding and optimizing performance issues in the chalk library — Claude read files, identified bottlenecks, proposed fixes, ran benchmarks. (2) Adding dark mode to an app using Playwright MCP server — Claude controlled a browser, took screenshots, made iterative UI changes based on visual feedback. Key point: Claude Code's default tools are powerful, and adding MCP servers extends its capabilities dramatically.

---

## Section 2: Getting Hands On

### Lesson 4. Claude Code setup (text)
Install: brew install --cask claude-code (macOS) or curl scripts. Run 'claude' at terminal to authenticate. AWS Bedrock and Google Cloud Vertex options available with additional setup.

### Lesson 5. Project setup (text)
Clone https://github.com/anthropics/courses, cd into claude-code-in-action. Basic TypeScript app with Node backend.

### Lesson 6. Adding context
Critical concept: context management. Too little context = Claude can't solve the task. Too much irrelevant context = Claude's effectiveness decreases. Ways to add context: (1) Directly in your prompt — paste code, describe the issue. (2) Use @-mentions to reference specific files. (3) Use images — paste screenshots with Ctrl+V. (4) CLAUDE.md file — persistent project-level instructions that Claude reads automatically. CLAUDE.md is the most important context tool. Put project conventions, architecture notes, common patterns there.

### Lesson 7. Making changes
Practical features: (1) Paste screenshots with Ctrl+V to show Claude what to change. (2) Claude shows diffs before applying — you can approve/reject. (3) Use /undo to revert changes. (4) Claude can run dev servers and verify changes. (5) Multi-file changes are tracked together. Tip: Be specific about what you want. Vague requests get vague results.

### Lesson 8. Controlling context
Techniques: (1) Press Escape to interrupt Claude mid-task and redirect. (2) Combine Escape + memories to fix repeated mistakes. (3) Use /clear to reset conversation context when switching tasks. (4) Use /compact to summarize long conversations and free up context window. (5) Start new conversations for unrelated tasks rather than continuing one long conversation. The Escape key is powerful — lets you course-correct in real-time.

### Lesson 9. Custom commands
Create custom commands in .claude/commands/ directory as .md files. The filename becomes the command name (e.g., audit.md → /audit). Commands can contain detailed prompts for automating repetitive tasks. Example: an audit command that checks dependencies for vulnerabilities, updates them, and runs tests. Restart Claude Code after adding new commands.

### Lesson 10. MCP servers with Claude Code
MCP servers add new tools to Claude Code. Install with: claude mcp add [name] -- [command]. Example: Playwright MCP server gives Claude browser control. Permission management: settings.local.json has an "allow" array for auto-approving tool usage. MCP servers can be local (run on your machine) or remote. Browse available servers at the MCP registry.

### Lesson 11. Github integration
Install with /install-github-app. Adds two GitHub Actions: (1) @Claude mentioning — tag Claude in issues/PRs to assign tasks. (2) Auto PR review — Claude reviews every new PR. Both actions are customizable. You can add additional triggers based on GitHub events. Claude can create branches, make changes, and submit PRs directly from GitHub issues. Powerful for automation: label-based triggers, scheduled tasks, etc.

---

## Section 3: Hooks and the SDK

### Lesson 12. Introducing hooks
Hooks run commands before or after Claude uses a tool. Use cases: auto-format code after file writes, run tests after edits, block reading sensitive files. Two types: PreToolUse (runs before a tool executes, can block it) and PostToolUse (runs after a tool executes). Hook scripts receive tool call info via stdin as JSON and can return JSON to control behavior (e.g., block the action, modify output).

### Lesson 13. Defining hooks
Practical example: creating a hook to prevent Claude from reading .env files. Configuration in settings.local.json under hooks. Each hook has: a matcher (which tools to watch — e.g., "Read", "Grep"), and a command (script to run). PreToolUse hooks receive tool_input with details like file_path. The script checks if the file matches .env and returns {"decision": "block", "reason": "..."} to prevent access.

### Lesson 14. Implementing a hook
Step-by-step implementation: (1) Add hook config in settings.local.json under hooks.PreToolUse. (2) Set matcher to "Read|Grep" to watch file access tools. (3) Point command to a script file (use absolute paths for security). (4) Script reads stdin JSON, checks tool_input.file_path or tool_input.pattern. (5) If .env is detected, output {"decision":"block","reason":"Sensitive file"}. (6) Otherwise, output nothing or empty JSON to allow the action.

### Lesson 15. Gotchas around hooks (text)
Security recommendation: use absolute paths for hook scripts to prevent path interception attacks. This makes sharing settings.json harder (different machines have different paths). Solution: use a settings.example.json with $PWD placeholder, and a setup script that generates the actual settings.json with resolved paths.

### Lesson 16. Useful hooks!
Two practical hooks: (1) Auto-build hook — a PostToolUse hook that runs the TypeScript compiler after any file write. If the build fails, the error output is passed back to Claude, which then automatically fixes the issue. This creates a tight feedback loop: write → build → fix → build again. (2) Query review hook — uses the Claude Code SDK inside a hook. Before Claude runs any SQL-related tool, the hook sends the query to a separate Claude instance for security review. If the query is flagged as dangerous (e.g., DROP TABLE), it gets blocked. This demonstrates hooks + SDK working together for powerful automation.

### Lesson 17. Another useful hook (text)
Additional hook types beyond PreToolUse/PostToolUse: Notification (when Claude needs permission or is idle 60s), Stop (when Claude finishes responding), SubagentStop (when a Task/subagent finishes), PreCompact (before compaction), UserPromptSubmit (when user submits a prompt, before processing), SessionStart/SessionEnd. Important: stdin input format varies by hook type. The tool_input in PreToolUse varies by which tool is being called.

### Lesson 18. The Claude Code SDK
SDK allows programmatic use of Claude Code via CLI, TypeScript, or Python. Same Claude Code with all its tools. Most useful as part of larger pipelines. Demo: TypeScript SDK script that finds duplicate SQL queries across a project. The SDK's conversation array works like a chat — you send messages and get responses with tool use results. Stream responses for real-time output. Key: the SDK lets you embed Claude Code's intelligence into any automated workflow.

---

## Section 4: Wrapping Up

### Lesson 19. Summary and next steps
Three recommendations: (1) Keep watching claude code homepage for new features — it's constantly changing. (2) Experiment — try custom commands, CLAUDE.md instructions, different MCP servers. (3) Automate — use GitHub integration to delegate repetitive tasks to Claude based on repository events.
