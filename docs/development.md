# Development Setup (Windows)

Requires Node.js >= 20 and pnpm 9.

```powershell
npm install -g pnpm@9.12.0
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```

Run individually:

```powershell
pnpm dev:backend   # NestJS on http://127.0.0.1:3001
pnpm dev:frontend  # Vite on http://127.0.0.1:5173
pnpm dev:desktop   # Electron (needs backend dist + frontend dev server or dist)
```

One-command desktop smoke test (static checks + backend boot + health):

```powershell
pnpm build
pnpm --filter @tutor-manager/desktop smoke
```

Env files: copy `.env.example` to `.env` per app as needed.
Ports: frontend $5173$, backend $3001$ on $127.0.0.1$ only.
