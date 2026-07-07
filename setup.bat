@echo off
setlocal enabledelayedexpansion

echo Installing dependencies and setting up the project...

echo.
echo Installing frontend dependencies...
cd frontend
call npm install
if errorlevel 1 (
  echo [ERROR] npm install failed in frontend/
  exit /b 1
)

if not exist "env.example" (
  echo [ERROR] frontend\env.example not found. Cannot create .env.local.
  cd ..
  exit /b 1
)
copy /Y env.example .env.local >nul
if errorlevel 1 (
  echo [ERROR] Failed to copy frontend\env.example to .env.local
  cd ..
  exit /b 1
)
echo Created frontend\.env.local from env.example

echo.
echo Installing backend dependencies...
cd ..\backend
call npm install
if errorlevel 1 (
  echo [ERROR] npm install failed in backend/
  exit /b 1
)

if not exist "env.example" (
  echo [ERROR] backend\env.example not found. Cannot create .env.
  cd ..
  exit /b 1
)
copy /Y env.example .env >nul
if errorlevel 1 (
  echo [ERROR] Failed to copy backend\env.example to .env
  cd ..
  exit /b 1
)
echo Created backend\.env from env.example

cd ..
echo.
echo Setup complete! Remember to fill in real values in frontend\.env.local and backend\.env
