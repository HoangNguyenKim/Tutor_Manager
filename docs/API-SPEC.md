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

- `GET /api/students?search=&status=active|archived|all&subject=&page=&pageSize=`: list with search (name/phone/parentContact), status filter (default `active`), subject filter, pagination. Response `200`: `ApiResponse<StudentListResponse>`.
- `POST /api/students`: body `CreateStudentDto { name*, phone?, parentContact?, grade?, subject?, hourlyRateVnd? (int >= 0), notes? }`. Response `201`. Errors: `400 VALIDATION`.
- `GET /api/students/:id?includeCounts=true`: details + optional lesson/payment counts. `404 NOT_FOUND` when missing.
- `PATCH /api/students/:id`: partial update; empty name → `409 BUSINESS_RULE`.
- `POST /api/students/:id/archive` / `:id/restore`: soft archive via `isActive`. No hard delete — students with lessons/payments are never deleted (FK `Restrict` + no delete endpoint).

```ts
interface StudentDto { id: string; name: string; phone?: string; notes?: string; createdAt: string }
```

## `GET /api/lessons` / `POST /api/lessons` / `POST /api/lessons/:id/complete` — planned

Durations integer minutes, money integer VND. Completing snapshots tuition.

- `POST /api/lessons`: body `CreateLessonDto { studentId: string, scheduledStart: string, scheduledMinutes: number, tuitionVnd: number }`. Response `201`.
- `POST /api/lessons/:id/complete`: body `CompleteLessonDto { actualMinutes: number, bonusMinutes?: number }`. Response `200`, or `409 CONFLICT` if already completed (record preserved).
- Errors: `400 VALIDATION`, `404 NOT_FOUND`, `422 BUSINESS_RULE`.

```ts
interface LessonDto { id: string; studentId: string; scheduledStart: string; scheduledMinutes: number; actualMinutes?: number; bonusMinutes: number; billableMinutes: number; tuitionVnd: number; status: 'scheduled' | 'completed' | 'cancelled' }
```

## `GET /api/payments` / `POST /api/payments` — planned

- `POST`: body `CreatePaymentDto { studentId: string, amountVnd: number, paidAt: string }`. Response `201`. Errors: `400 VALIDATION` (non-integer or negative), `404 NOT_FOUND` (student).

```ts
interface PaymentDto { id: string; studentId: string; amountVnd: number; paidAt: string }
```

## `GET /api/calendar/status` / `POST /api/calendar/sync` — planned, optional

Only scheduled lesson info (`student name`, `start`, `minutes`) leaves the machine. Never tuition, payments, actual/bonus minutes.

- `GET /api/calendar/status`: `{ connected: boolean, lastSyncAt?: string }`.
- `POST /api/calendar/sync`: triggers one-way push of scheduled lessons. Conflicting remote edits are preserved, returned as `409 CONFLICT` with both versions — never auto-overwritten.
