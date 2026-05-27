@echo off
title Starta PostgreSQL databas - Lagerpro
chcp 65001 > nul
cls
echo =========================================================
echo       STARTAR POSTGRESQL OCH ADMINER VIA DOCKER
echo =========================================================
echo.
echo Startar containrarna i bakgrunden...
docker compose up -d
echo.
echo =========================================================
echo   STATUS: Containrarna koers nu!
echo.
echo   * PostgreSQL-databasen aer aktiv pa port: 5439
echo   * Adminer webbgraenssnitt koers pa: http://localhost:8089
echo.
echo   Anvaendaruppgifter:
echo     - System:   PostgreSQL
echo     - Server:   postgres_db (eller localhost,5439 fran Windows)
echo     - Databas:  lagerpro
echo     - Anvaendare: lager
echo     - Loesenord: lager
echo =========================================================
echo.
pause
