#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "=== Starting Tutor Manager ==="

# Check for pnpm
if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm is not installed. Please install pnpm (npm install -g pnpm@9.12.0)."
    exit 1
fi

# Install dependencies if node_modules missing
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
fi

# Auto-initialize .env files if missing
if [ ! -f "apps/backend/.env" ] && [ -f "apps/backend/.env.example" ]; then
    echo "Creating apps/backend/.env from .env.example..."
    cp apps/backend/.env.example apps/backend/.env
fi

if [ ! -f "apps/frontend/.env" ] && [ -f "apps/frontend/.env.example" ]; then
    echo "Creating apps/frontend/.env from .env.example..."
    cp apps/frontend/.env.example apps/frontend/.env
fi

echo "Building shared and backend packages..."
pnpm --filter @tutor-manager/shared build
pnpm --filter @tutor-manager/backend build
pnpm --filter @tutor-manager/frontend build

echo "Launching Tutor Manager Desktop..."
pnpm --filter @tutor-manager/desktop start
