@echo off
title SLA Monitoring System

echo ========================================================
echo   Starting Autonomous Multi-Agent SLA Monitoring System
echo ========================================================
echo.

:: Detect Python executable (workspace virtualenv, local venv, or system python)
set PYTHON_CMD=python
if exist "%~dp0..\.venv\Scripts\python.exe" set PYTHON_CMD="%~dp0..\.venv\Scripts\python.exe"
if exist "%~dp0backend\venv\Scripts\python.exe" set PYTHON_CMD="%~dp0backend\venv\Scripts\python.exe"

echo [*] Starting Backend API on port 5000...
start "SLA Backend API" cmd /k "cd /d "%~dp0backend" && %PYTHON_CMD% run.py"
timeout /t 3 /nobreak >nul

echo [*] Starting Frontend UI on port 5173...
start "SLA Frontend Console" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 3 /nobreak >nul

echo [*] Launching SLA Command Center in browser...
start http://localhost:5173/login

echo [OK] SLA Monitoring System launched successfully!
