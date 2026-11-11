# Development Setup

Requires Node.js >= 20 and pnpm 9. From the repository root on macOS, Windows,
or Linux:

```bash
npm install --global pnpm@9.12.0
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```

Prisma Client is generated automatically after installation and before backend
build, typecheck, test, seed, and start commands. To generate it manually:

```bash
pnpm --filter @tutor-manager/backend db:generate
```

Run individually:

```bash
pnpm dev:backend   # NestJS on http://127.0.0.1:3001
pnpm dev:frontend  # Vite on http://127.0.0.1:5173
pnpm dev:desktop   # Electron (needs backend dist + frontend dev server or dist)
```

One-command desktop smoke test (static checks + backend boot + health):

```bash
pnpm build
pnpm --filter @tutor-manager/desktop smoke
```

To launch the built desktop app, run `pnpm start`. On macOS, you can also run
`./start.command` from Terminal or open the executable script from Finder.

Env files: copy `.env.example` to `.env` per app as needed.
Ports: frontend `5173`, backend `3001` on `127.0.0.1` only.
Browser dev needs `VITE_DEV_TOKEN` in `apps/frontend/.env` matching backend
`LOCAL_TOKEN` (protected APIs require this token; packaged app gets the token
via the preload bridge instead).
