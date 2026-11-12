# Form regression tests

No frontend test framework was installed. These tests use the existing Node/tsx, Vite, React and React Query dependencies; no package manifests or lockfiles were changed.

## Pure validation and submission tests

From the repository root, with Node supporting native TypeScript stripping:

```sh
node --test apps/frontend/src/hooks/formValidation.test.mjs
```

For the project's older supported Node versions, use the existing backend tsx dependency:

```sh
pnpm --filter @tutor-manager/backend exec tsx --test ../frontend/src/hooks/formValidation.test.mjs
```

## Real browser component interactions

Start Vite on an unused port:

```sh
pnpm --filter @tutor-manager/frontend exec vite --host 127.0.0.1 --port 5175 --strictPort
```

Open `http://127.0.0.1:5175/src/hooks/form-test.html`. The page renders the real components in isolated React Query providers, uses an in-memory fetch transport, and displays machine-readable results in `window.__formResults`. It never calls the real backend or writes a database. Keep the test tab visible so background-tab timer throttling does not delay the suite.

Coverage includes invalid student values, trimmed payloads, synchronous duplicate submissions, ambiguous-payment-response retries and idempotency keys, payment correction and adjustment confirmations, calendar edit defaults/cancellation accessibility, lesson completion, dependent-cache invalidation, archive-error retry, and hours-load recovery.

The calendar edit/cancellation regressions now pass. Coverage verifies retained edit values and PATCH payloads, explicit cancellation confirmation, failure/retry feedback without duplicate submissions, read-only completed/cancelled history, and a single modal when switching from edit to completion. Latest real-browser run: 14 passed, 0 failed. Test transport is isolated and does not write the application database.
