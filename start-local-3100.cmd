@echo off
setlocal

set "NODE_HOME=C:\tmp\node-v22.20.0-win-x64"
set "PORT=3100"

if exist "%NODE_HOME%\node.exe" (
  set "PATH=%NODE_HOME%;%PATH%"
)

cd /d "%~dp0"

if not exist "logs" mkdir "logs"

echo Starting Libre Closet at http://127.0.0.1:%PORT%/
echo Using node:
node -v

npm.cmd run start:prod > "logs\local-3100.log" 2>&1
