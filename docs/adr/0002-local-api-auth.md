# ADR-0002: Loopback-only API with install token

- Status: accepted
- Date: 2026-10-08

## Context

NestJS runs locally per user. No accounts, but any local process could call it.

## Decision

Bind `127.0.0.1` only. Random 256-bit bearer token generated on first boot, stored with `0600` in user-data dir. Packaged renderer holds it in memory only (via preload at startup), never in localStorage. Dev allows allowlisted-Origin-on-loopback without token.

## Consequences

No login UX; other users/processes without the token file are rejected. Never bind `0.0.0.0`.
