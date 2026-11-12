# Tutor Manager — UI and workflow refinement review

> Historical checkpoint: see `docs/qa-final-review.md` for the current verified status. Calendar, payment integrity/idempotency, lesson rate inheritance and report validation findings below have since been addressed.

## Follow-up verification (supersedes the earlier calendar blocker below)

CalendarPage is now fully wired: original student/subject/duration are retained, cancellation confirmation and retry errors live inside the dialog, completion replaces the edit dialog, and completed/cancelled lessons are read-only. Pending submissions and drag confirmation use synchronous gates. Archived/missing active-list students retain their existing option. Strict duration and local datetime helpers are connected.

Parent rerun: full monorepo build PASS, frontend typecheck/lint PASS, UI tests 10/10, validation tests 34/34, real-browser interaction tests 14/14, backend suites 11/11 and tests 78/78. The backend suite used Electron's Node runtime for SQLite compatibility. HTTP smoke against isolated port 3097 also passed create/edit/complete/payment deduplication/report reconciliation with scratch-only SQLite data. No production data changed. No commits/pushes.

Still under focused review: report query validation, financial write atomicity, and concurrent mutation safeguards. The large JS bundle and normal-Node SQLite ABI mismatch remain environment/performance limitations. The historical section below records the previous checkpoint, not current calendar failures.

## Scope and preservation

Updated the existing React/NestJS application in place. No database migration, application-data deletion, commit or push was performed for this upgrade. Existing API contracts and offline-first architecture are retained.

## Implemented

- Shared pastel light theme using primary #F8DCE6, blush #FFF5F8, ivory #FFFDFB, lavender #E9D5E5, rose #D8A7B1, text #705B68; darker rose interactive styling and functional dark mode.
- Shared cards, forms, buttons, navigation, responsive shell, reports, dashboard and notifications polished. Dashboard retains all ten existing API metrics.
- Keyboard-contained dialogs with Escape/focus restoration; custom field styling preserves shared styles; buttons default to non-submit; notifications are dismissible.
- Date filters validate before applying and include the complete final local day. Failed report requests show retryable errors instead of empty results.
- Student fields: whitespace/length/phone/integer validation, duplicate-submit protection, archive error/retry. Optional backend fields can be cleared.
- Tuition: positive safe integer amounts, valid nonfuture dates, reason/note limits, confirmation, duplicate/retry idempotency protection. Backend rejects conflicting idempotency payloads.
- Completion dialog: integer duration 1–480, status guards and submission protection. Dependent caches refresh after mutations.
- Backend rejects impossible dates, invalid recurrence time/timezone/ranges before persistence, blank audit reasons and unsafe monetary values. Monthly reports include adjustments and adjustment-only students.
- Nonfunctional header search and demo settings save were removed rather than presented as working functionality. Unconnected Google Calendar integration is explicit.

## Parent verification (actual execution)

- Full monorepo `pnpm build`: PASS (shared, backend, frontend, desktop).
- `pnpm --filter @tutor-manager/frontend test`: 10 passed.
- `node --test apps/frontend/src/hooks/formValidation.test.mjs`: 34 passed.
- Frontend ESLint, existing a11y checks and `git diff --check`: PASS.
- Backend: 11 suites, 78 tests passed using Electron 31.4.0 as Node against the installed Electron-compatible SQLite binary.
- Real React/browser form harness on port 5175: 9 passed, 1 failed. Harness uses an explicit in-memory fetch test transport, not production data.
- Actual application browser: blush background rgb(255,245,248), text rgb(112,91,104); desktop shell rendered without document horizontal overflow. Live backend is offline in this browser session; populated live-data end-to-end acceptance is NOT claimed.

Backend test command (from apps/backend):

```bash
ELECTRON_RUN_AS_NODE=1 '../../node_modules/.pnpm/electron@31.4.0/node_modules/electron/dist/electron.exe' node_modules/jest/bin/jest.js --config jest.e2e.config.cjs --runInBand --testTimeout=30000
```

## Unresolved / not approved

1. HIGH: Calendar event editing loses original student selection; subject and duration reset. The real browser test fails `Edit lost student`. Cancellation/completion controls also need modal placement review. CalendarPage.tsx changes were blocked by withdrawn tool approval; no retry/bypass was performed. Requires renewed user authorization before editing that file.
2. Native SQLite currently targets Electron ABI 125, not available Node 22/26 ABIs. Backend tests pass under Electron; ordinary Node backend launch is not verified as working.
3. Vite warns about the ~1.49 MB minified JS bundle. Build passes; code splitting remains an optimization task.
4. Concurrent backend overlap/idempotency races and payment-correction/audit atomicity remain audit leads, not confirmed fixed defects. Query validation for report year/ranges needs further review.
5. The a11y check is a project check, not a complete accessibility certification. No claim that all possible business flows are verified.

The upgrade is substantial but not complete acceptance until the calendar regression and live-data integration are resolved.
