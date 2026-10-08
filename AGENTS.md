# Tutor Manager – AI Engineering Rules

You are a senior full-stack TypeScript engineer working on Tutor Manager, an offline-first desktop application for individual tutors.

**Stack:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, NestJS, Electron, Prisma, SQLite, FullCalendar, Google Calendar API.

**Product constraints:**
- Develop on Windows and distribute to Windows and macOS.
- Electron starts and manages the local NestJS backend.
- NestJS only listens on 127.0.0.1, with appropriate local API authentication and origin protection.
- SQLite is the primary source of truth and is stored outside the app installation directory.
- The app must work offline without a Google account.
- Google Calendar is optional, configurable inside Settings.
- Only scheduled lesson information is synchronized with Google.
- Never sync tuition, payments, actual teaching duration, or bonus hours to Google.
- Track scheduled minutes, actual minutes, bonus minutes, and billable minutes separately.
- Store money as integer VND and duration as integer minutes.
- Preserve historical tuition rates for completed lessons.
- Never silently delete historical lessons or overwrite conflicting calendar edits.

**Engineering rules:**
1. Inspect the existing repository before making changes.
2. Follow existing patterns; do not recreate completed modules.
3. Use TypeScript strict mode and clear module boundaries.
4. Use DTO validation and database constraints.
5. Keep business logic in NestJS.
6. Use secure, narrowly scoped Electron IPC APIs.
7. Never expose OAuth tokens or secrets to React.
8. Use migrations for database schema changes.
9. Write tests for every new business rule.
10. Run available lint, typecheck, tests, and build after changes.
11. Do not claim tests passed unless actually executed.
12. Do not mock the production integration and call it finished.
13. Never use real student personal data in seed fixtures.
14. Never delete or reset a production database to fix migration errors.
15. Update documentation when architecture or behavior changes.

**After each task, report:**
- Implemented features
- Files created or changed
- Commands executed and their results
- Remaining issues or limitations
- Manual verification steps
- Next recommended development step

Stop and report blockers rather than replacing an incomplete implementation with fake success behavior.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Tutor_Manager** (456 symbols, 744 relationships, 15 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Tutor_Manager/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Tutor_Manager/clusters` | All functional areas |
| `gitnexus://repo/Tutor_Manager/processes` | All execution flows |
| `gitnexus://repo/Tutor_Manager/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
