# ADR-0005: Google Calendar is scheduled-info-only and optional

- Status: accepted
- Date: 2026-10-08

## Context

Calendar sync is convenient but tuition, payments, and actual/bonus minutes are sensitive and must never leave the machine.

## Decision

Sync pushes only scheduled lesson info (student name, start, minutes). Refresh tokens stay in the backend store; renderer never sees them. Remote conflicts return `409` with both versions — never auto-overwrite, never delete history. App works fully offline without Google.

## Consequences

Smaller sync payload, no financial leakage, explicit conflict UX later.
