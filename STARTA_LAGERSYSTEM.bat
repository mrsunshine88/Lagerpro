@echo off
title LAGERPRO - Startpanel
chcp 65001 > nul
cls

echo ===================================================
echo               LAGERPRO STARTPANEL
echo ===================================================
echo.
echo Välj vilken version du vill starta:
echo [1] Fullstack-versionen (React + NestJS + PostgreSQL) - REKOMMENDERAD!
echo [2] Gamla Legacy-versionen (Flask + Python)
echo [3] Avsluta
echo.
set /p val="Ange ditt val (1-3): "

if "%val%"=="1" goto fullstack
if "%val%"=="2" goto legacy
if "%val%"=="3" goto end
goto end

:fullstack
echo.
if not exist .env (
    echo ===================================================
    echo       KONFIGURATION: POSTGRESQL DATABAS
    echo ===================================================
    echo.
    echo Hittade ingen sparad databaskoppling (.env-fil).
    echo För att köra fullstack-versionen med PostgreSQL behöver vi din anslutningssträng.
    echo Du kan använda en lokal Postgres eller en molndatabas (t.ex. Supabase eller Neon.tech).
    echo.
    set /p db_url="Klistra in din PostgreSQL-anslutningssträng (DATABASE_URL): "
    if not "%db_url%"=="" (
        echo DATABASE_URL=%db_url%>.env
        echo [OK] Databaskopplingen har sparats i filen .env!
        echo.
    ) else (
        echo [VARNING] Ingen anslutningssträng angavs. Försöker med standard lokal Postgres...
        echo.
    )
)

:: Läs .env-filen ifall den finns
if exist .env (
    for /f "usebackq tokens=*" %%i in (`type .env ^| findstr /v "^#"`) do (
        set %%i
    )
)

echo [SYSTEM] Startar NestJS Backend (Port 3000)...
start "Lagerpro - Backend" cmd.exe /c "cd backend && npm run start:dev"
echo [SYSTEM] Startar Vite Frontend (Port 5173)...
start "Lagerpro - Frontend" cmd.exe /c "cd frontend && npm run dev -- --open"
echo.
echo [OK] Båda servrarna har startats i separata fönster!
echo Skulle webbläsaren inte öppnas automatiskt, gå till: http://localhost:5173
echo.
pause
goto end

:legacy
echo.
echo [SYSTEM] Startar webbläsaren lokalt...
start http://localhost:5000
echo [SYSTEM] Startar Flask Server (Port 5000)...
python app.py
pause
goto end

:end
exit
