@echo off
setlocal

REM Run the backend from the repository root.
cd /d "%~dp0backend" || (
  echo Failed to open backend directory.
  pause
  exit /b 1
)

echo [1/5] Releasing port 3000 if needed...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%p >nul 2>&1
)

if not exist "node_modules" (
  echo [2/5] Installing dependencies...
  call npm install
  if errorlevel 1 goto :fail
) else (
  echo [2/5] Dependencies already installed.
)

echo [3/5] Generating Prisma client...
call npx prisma generate
if errorlevel 1 goto :fail

echo [4/5] Applying Prisma migrations...
call npx prisma migrate deploy
if errorlevel 1 goto :fail

echo [5/5] Starting backend server...
call npm run dev
if errorlevel 1 goto :fail

exit /b 0

:fail
echo.
echo Backend startup failed.
pause
exit /b 1
