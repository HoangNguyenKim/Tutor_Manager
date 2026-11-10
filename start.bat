@echo off
cd /d "%~dp0"
echo === Starting Tutor Manager ===

WHERE pnpm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo pnpm is not installed. Please install pnpm first.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing dependencies...
    pnpm install
)

REM Auto-initialize .env files if missing
if not exist "apps\backend\.env" (
    if exist "apps\backend\.env.example" (
        echo Creating apps\backend\.env from .env.example...
        copy "apps\backend\.env.example" "apps\backend\.env" >nul
    )
)

if not exist "apps\frontend\.env" (
    if exist "apps\frontend\.env.example" (
        echo Creating apps\frontend\.env from .env.example...
        copy "apps\frontend\.env.example" "apps\frontend\.env" >nul
    )
)

echo Building packages...
pnpm --filter @tutor-manager/shared build
pnpm --filter @tutor-manager/backend build
pnpm --filter @tutor-manager/frontend build

echo Launching Tutor Manager Desktop...
pnpm --filter @tutor-manager/desktop start
pause
