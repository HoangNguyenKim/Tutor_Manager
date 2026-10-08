# ADR-0004: Electron spawns backend, narrow preload bridge

- Status: accepted
- Date: 2026-10-08

## Context

Renderer must not hold secrets, SQL, or Node access; backend must start/stop with the app.

## Decision

Main spawns `backend/dist/main.js` and kills it on quit. `contextIsolation: true, nodeIntegration: false`. Preload exposes only `tutorManager.getBackendUrl()` / `getVersion()` — no `ipcRenderer` passthrough, no tokens, no SQL. OAuth (if any) lives in main/backend.

## Consequences

Renderer compromise cannot reach tokens or DB. New bridge methods require an ADR update.
