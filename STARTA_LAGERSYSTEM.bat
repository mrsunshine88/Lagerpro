@echo off
title LAGERPRO - Serverstart
echo ===================================================
echo              LAGERPRO STARTUTILITY
echo ===================================================
echo.
echo Startar webbläsaren lokalt...
start http://localhost:5000
echo.
echo Startar servern...
python app.py
pause
