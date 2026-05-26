@echo off
title Starta PostgreSQL databas - Lagerpro
chcp 65001 > nul
echo =========================================================
echo       STARTAR POSTGRESQL & ADMINER VIA DOCKER
echo =========================================================
echo.
echo Startar containrarna i bakgrunden...
docker compose up -d
echo.
echo =========================================================
echo   STATUS: Containrarna körs nu!
echo.
echo   * PostgreSQL-databasen är aktiv på port: 5439
echo   * Adminer webbgränssnitt körs på: http://localhost:8089
echo.
echo   Användaruppgifter:
echo     - System:   PostgreSQL
echo     - Server:   postgres_db (eller localhost,5439 från Windows)
echo     - Databas:  lagerpro
echo     - Användare: lager
echo     - Lösenord: lager
echo =========================================================
echo.
pause
