# Tutor Manager

Offline-first desktop app for individual tutors. Monorepo: React + Vite frontend, NestJS local backend, Electron shell, shared contracts.

## Quickstart (macOS, Windows, Linux)

Requires Node.js >= 20 and pnpm 9. From this project directory (the directory
containing this README), install pnpm if needed and run:

```bash
npm install --global pnpm@9.12.0
pnpm install
pnpm start
```

`pnpm start` builds the app and launches the desktop application. Prisma Client
is generated automatically during installation and before backend build/run
commands.

For development, use separate terminals:

```bash
pnpm dev:backend
pnpm dev:frontend
```

See [docs/development.md](./docs/development.md) and [docs/architecture.md](./docs/architecture.md).

The frontend uses relative asset paths (`base: './'` in Vite) so Electron can
load the built interface directly through `file://` without a development server.
"# Tutor_Manager" 
