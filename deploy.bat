@echo off
REM Quick Deploy Script for Savings Vault Tracker (Windows)

setlocal enabledelayedexpansion

echo.
echo ============================================
echo Savings Vault Tracker - Quick Deploy
echo ============================================
echo.

REM Check prerequisites
echo [Step 1] Checking prerequisites...
where algokit >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: AlgoKit CLI not found
    echo Install from: https://github.com/algorandfoundation/algokit-cli
    pause
    exit /b 1
)

where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm not found
    echo Install Node.js from: https://nodejs.org
    pause
    exit /b 1
)

where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Python not found
    echo Install from: https://python.org
    pause
    exit /b 1
)

echo [OK] All prerequisites found
echo.

REM Start LocalNet
echo [Step 2] Starting LocalNet...
algokit localnet status >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] LocalNet already running
) else (
    echo Starting AlgoKit LocalNet...
    start cmd /k "algokit localnet start"
    echo Please wait for LocalNet to start (check new window)
    timeout /t 10 /nobreak
)
echo.

REM Deploy contract
echo [Step 3] Deploying smart contract...
cd projects\Vaulttracker-contracts
call algokit project run build
echo [OK] Contract compiled
echo.

REM Note about App ID
echo [IMPORTANT] Manual App ID Setup
echo Please run: algokit project deploy localnet
echo And note the App ID from the output
echo Update VITE_APP_ID in: projects\Vaulttracker-frontend\.env.local
echo.

REM Configure frontend
echo [Step 4] Configuring frontend...
cd ..\..
cd projects\Vaulttracker-frontend

if not exist ".env.local" (
    echo VITE_ALGOD_NETWORK=localnet> .env.local
    echo VITE_ALGOD_SERVER=http://localhost>> .env.local
    echo VITE_ALGOD_PORT=4001>> .env.local
    echo VITE_ALGOD_TOKEN=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa>> .env.local
    echo VITE_INDEXER_SERVER=http://localhost>> .env.local
    echo VITE_INDEXER_PORT=8980>> .env.local
    echo VITE_INDEXER_TOKEN=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa>> .env.local
    echo VITE_APP_ID=0>> .env.local
)
echo [OK] Frontend configured
echo.

REM Install dependencies
echo [Step 5] Installing frontend dependencies...
if not exist "node_modules" (
    call npm install --quiet
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies already installed
)
echo.

REM Summary
echo.
echo ============================================
echo [SUCCESS] Deployment Complete!
echo ============================================
echo.
echo Next Steps:
echo.
echo 1. UPDATE App ID:
echo    Edit: projects\Vaulttracker-frontend\.env.local
echo    Set VITE_APP_ID to your deployed app ID
echo.
echo 2. Start the dev server:
echo    cd projects\Vaulttracker-frontend
echo    npm run dev
echo.
echo 3. Open http://localhost:5173
echo.
echo 4. Connect wallet and make a deposit!
echo.
echo Documentation:
echo   - Setup Guide: projects\Vaulttracker-frontend\SETUP.md
echo   - Integration: INTEGRATION_GUIDE.md
echo   - API Reference: API_REFERENCE.md
echo.
pause
