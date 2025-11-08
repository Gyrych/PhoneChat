@echo off
setlocal
REM One-click Debug APK build (double-click runnable)

REM Go to repo root (this file is in scripts/)
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%\.."

echo [INFO] Repo root: %CD%

REM Run PowerShell builder with execution policy bypass
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\build-apk.ps1"
set "EXITCODE=%ERRORLEVEL%"

if not "%EXITCODE%"=="0" (
  echo [FAIL] Build failed with exit code %EXITCODE%
  pause
  exit /b %EXITCODE%
)

echo [OK] Build completed. Outputs:
echo   - android\app\build\outputs\apk\debug\app-debug.apk
echo   - dist\apk\FreeChat-debug.apk

pause
endlocal
exit /b 0


