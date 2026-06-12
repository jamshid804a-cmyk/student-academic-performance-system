@echo off
echo ========================================
echo    Starting My Project
echo ========================================

echo [1/3] Starting MySQL...
net start MySQL97 2>nul
if %errorlevel%==2 echo MySQL already running!

echo [2/3] Starting Web App...
cd /d C:\my-project
start "Next.js Web App" cmd /k "npm run dev"

echo [3/3] Done!
echo ========================================
echo    Web App: http://localhost:3000
echo    Network: http://192.168.18.137:3000
echo ========================================
pause