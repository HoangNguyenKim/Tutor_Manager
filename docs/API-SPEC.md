# Tutor Manager — API Spec

Base URL: `http://127.0.0.1:3001`. Global prefix `/api`. Auth: `Authorization: Bearer <token>` (packaged) or allowlisted `Origin` on loopback (dev). See [architecture](./architecture.md).

Every response uses the shared envelope (`@tutor-manager/shared`):

```ts
interface ApiResponse<T> { ok: boolean; data?: T; error?: { code: string; message: string; details?: unknown } }
```

Status mapping: `400 VALIDATION`, `401 UNAUTHORIZED`, `404 NOT_FOUND`, `409 CONFLICT`, `422 BUSINESS_RULE`, `500 INTERNAL`.

## `GET /api/health` — implemented

Liveness probe, public (no token), no DB. Still requires loopback `Host` and an allowlisted-or-absent `Origin`.

- Response `200`: `{ ok: true, data: { ok: true, service: 'tutor-manager-backend', time: 'ISO-8601' } }`
- TS: `HealthStatus` in shared.

## `GET /api/echo/ping` / `POST /api/echo` — implemented, test-only

Proves the secure integration: bearer-token auth + global DTO validation. Requires `Authorization: Bearer <LOCAL_TOKEN>`. Removed when the first real module lands.

- `GET /api/echo/ping` without token → `401 { ok: false, error: { code: 'UNAUTHORIZED', ... } }`.
- `POST /api/echo` with body `{ name: string(1-120), amountVnd: int >= 0 }`; invalid body → `400 { ok: false, error: { code: 'VALIDATION', details: [...] } }`.

## `GET /api/students` / `POST /api/students` — implemented

- `GET /api/students?search=&status=active|archived|all&page=&pageSize=`: list with search (name/phone/parentContact), status filter (default `active`), pagination. Response `200`: `ApiResponse<StudentListResponse>`.
- `POST /api/students`: body `CreateStudentDto { name*, phone?, parentContact?, grade?, hourlyRateVnd? (int >= 0), notes? }`. No subject — a student takes many subjects across lessons. Response `201`. Errors: `400 VALIDATION`.
- `GET /api/students/:id?includeCounts=true`: details + optional lesson/payment counts. `404 NOT_FOUND` when missing.
- `PATCH /api/students/:id`: partial update; empty name → `409 BUSINESS_RULE`.
- `POST /api/students/:id/archive` / `:id/restore`: soft archive via `isActive`. No hard delete — students with lessons/payments are never deleted (FK `Restrict` + no delete endpoint).

```ts
interface StudentDto { id: string; name: string; phone?: string; notes?: string; createdAt: string }
```

## `GET /api/lessons` / `POST /api/lessons` — implemented

- `GET /api/lessons?from=&to=&studentId=&subject=&status=scheduled|completed|cancelled|all`: list with student info, ordered by start. Response `200`.
- `POST /api/lessons`: body `CreateLessonDto { studentId*, scheduledStart* (ISO UTC), scheduledMinutes* (1–480), subject* (Toán|Văn|Anh|Sinh|Hóa|Lý), timeZone?, hourlyRateVnd? }`. Overlap → `409 CONFLICT` with `conflictingIds`. Response `201`.
- `PATCH /api/lessons/:id`: reschedule (scheduled only, incl. subject); overlap → `409`. Completed/cancelled → `409 BUSINESS_RULE`.
- `POST /api/lessons/:id/cancel`: cancel keeps the row (history preserved). Completed cannot be cancelled. Idempotent.
- `POST /api/lessons/:id/complete`: body `CompleteLessonDto { actualMinutes* (1–480), bonusBillable?, billingPolicy? (actual|planned) }`. Computes bonus = max(0, actual − planned), billable per policy, tuition from the preserved rate snapshot. Re-complete → `409 CONFLICT` (record preserved). Cancelled → `409 BUSINESS_RULE`.
- `PATCH /api/lessons/:id/correct`: safe correction of a completed lesson (`actualMinutes?`, `bonusBillable?`); re-runs the engine against the snapshot rate.
- `POST /api/lessons/recurrence`: body `{ studentId*, weekday 0–6, startTime HH:mm, scheduledMinutes, timeZone?, validFrom*, validUntil?, hourlyRateVnd? }`. Generates weekly UTC instants locally (DST-stable via wall-clock resolve), skips overlaps. Response `{ rule, created, skipped }`.
- Timezone: `scheduledStart` stored UTC; `timeZone` (default `Asia/Ho_Chi_Minh`) records entry zone.

```ts
interface LessonDto { id: string; studentId: string; scheduledStart: string; scheduledMinutes: number; actualMinutes?: number; bonusMinutes: number; billableMinutes: number; tuitionVnd: number; status: 'scheduled' | 'completed' | 'cancelled' }
```

## `GET /api/payments` / `POST /api/payments` — implemented

- `GET /api/students/:id/statement?year=&month=`: monthly billing statement — completed lessons only (cancelled/scheduled excluded), adjustments, payments, `balanceVnd` (positive = owes, negative = overpaid). Integer VND; rounding once per lesson at completion.
- `GET /api/students/:id/payments`: payment history with correction audit trail.
- `POST /api/payments`: body `{ studentId*, amountVnd* (int >= 1), paidAt*, note?, idempotencyKey? }`. Repeats with the same key return the original row (`duplicate: true`) — no double charge.
- `PATCH /api/payments/:id/correct`: body `{ newAmountVnd*, reason* }`. Writes a `PaymentCorrection` audit row, then updates. Same amount → `409`.
- `POST /api/adjustments`: body `{ studentId*, amountVnd* (int, negative = discount), reason* }`. Explicit tuition adjustments.

```ts
interface PaymentDto { id: string; studentId: string; amountVnd: number; paidAt: string }
```

## `GET /api/calendar/status` / `POST /api/calendar/sync` — planned, optional

Only scheduled lesson info (`student name`, `start`, `minutes`) leaves the machine. Never tuition, payments, actual/bonus minutes.

- `GET /api/calendar/status`: `{ connected: boolean, lastSyncAt?: string }`.
- `POST /api/calendar/sync`: triggers one-way push of scheduled lessons. Conflicting remote edits are preserved, returned as `409 CONFLICT` with both versions — never auto-overwritten.
