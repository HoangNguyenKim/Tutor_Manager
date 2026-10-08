# ADR-0003: Single SQLite file in user-data dir

- Status: accepted
- Date: 2026-10-08

## Context

Offline-first, single-user, must survive app updates. Money in VND, durations in minutes, history must be preserved.

## Decision

One SQLite file (WAL) under the OS user-data dir, accessed only by NestJS repositories. Integer VND / integer minutes / ISO UTC text. Migrations only; never delete user DB to fix errors. Fictional seed data only.

## Consequences

Backup = copy one file. Updates never touch user data. ORM picked at first-schema ADR; no DB dep installed yet.
