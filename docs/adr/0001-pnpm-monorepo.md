# ADR-0001: pnpm workspaces monorepo

- Status: accepted
- Date: 2026-10-08

## Context

Frontend, backend, desktop, and shared contracts ship as one versioned desktop app on Windows (dev) for Windows/macOS (dist).

## Decision

One repo, pnpm workspaces: `apps/*`, `packages/*`. Shared DTOs in `@tutor-manager/shared`, no cross-app imports.

## Consequences

Single install/build/typecheck; Electron packages all three apps together. No per-app version drift.
