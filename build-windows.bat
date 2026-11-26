@echo off
REM ============================================================
REM   Minekube Launcher - one-click Windows build
REM   Rozbal ZIP a spust tento soubor (dvojklik).
REM   Pri prvnim spusteni si doinstaluje potrebne nastroje pres
REM   winget a pak sestavi instalator (.exe). Muze to chvili
REM   trvat (stahovani + kompilace, klidne 15-25 minut).
REM ============================================================
setlocal enableextensions
cd /d "%~dp0"
title Minekube Launcher - build

REM ------------------------------------------------------------
REM  Kontrola, ze se nekompiluje stara rozbalena kopie zdrojaku.
REM  Kdyz nekdo rozbali starsi ZIP a novy jen polozi vedle nej,
REM  build "projde", ale vysledny launcher ma stare chyby.
REM ------------------------------------------------------------
set "STALE="
if not exist "apps\app-frontend\src\pages\project\project-request.mjs" set "STALE=1"
if not exist "apps\app-frontend\src\pages\project\project-request.test.mjs" set "STALE=1"
findstr /C:"use crate::state::TunnelSocket;" "packages\app-lib\src\state\friends.rs" >nul 2>&1 || set "STALE=1"
findstr /C:"use crate::event::ProcessPayloadType;" "packages\app-lib\src\state\process.rs" >nul 2>&1 || set "STALE=1"
if defined STALE (
  echo.
  echo Tahle slozka neobsahuje aktualni zdrojaky - build by z ni vysel se starymi chybami.
  echo.
  echo Stahni znovu ZIP z vetve main, rozbal ho do NOVE prazdne slozky
  echo a spust tam build-windows.bat. Stare rozbalene kopie mazej.
  pause & exit /b 1
)

echo.
echo === [1/6] Kontrola winget ===
where winget >nul 2>&1
if errorlevel 1 (
  echo winget nenalezen. Nainstaluj "App Installer" z Microsoft Store a spust skript znovu.
  pause & exit /b 1
)

echo.
echo === [2/6] Instalace nastroju (preskoci se, co uz mas) ===
winget install -e --id Rustlang.Rustup --accept-source-agreements --accept-package-agreements --silent 2>nul
winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements --silent 2>nul
winget install -e --id OpenJS.NodeJS --accept-source-agreements --accept-package-agreements --silent 2>nul
winget install -e --id EclipseAdoptium.Temurin.17.JDK --accept-source-agreements --accept-package-agreements --silent 2>nul
winget install -e --id Microsoft.EdgeWebView2Runtime --accept-source-agreements --accept-package-agreements --silent 2>nul
echo   - Visual Studio C++ Build Tools (nutne pro kompilaci)...
winget install -e --id Microsoft.VisualStudio.2022.BuildTools --accept-source-agreements --accept-package-agreements --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended" 2>nul

echo.
echo === [3/6] Nastaveni cest k nastrojum ===
set "PATH=%USERPROFILE%\.cargo\bin;%ProgramFiles%\nodejs;%ProgramFiles%\Git\cmd;%PATH%"
for /d %%i in ("%ProgramFiles%\Eclipse Adoptium\jdk-17*") do set "JAVA_HOME=%%i"
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"

where cargo >nul 2>&1 || (echo Rust/cargo neni na PATH. Restartuj pocitac a spust skript znovu. & pause & exit /b 1)
where git   >nul 2>&1 || (echo Git neni na PATH. Nainstaluj Git for Windows nebo restartuj pocitac a spust skript znovu. & pause & exit /b 1)
where node  >nul 2>&1 || (echo Node.js neni na PATH. Restartuj pocitac a spust skript znovu. & pause & exit /b 1)

echo   cargo: & cargo --version
echo   git:   & git --version
echo   node:  & node --version
if defined JAVA_HOME (echo   java:  %JAVA_HOME%) else (echo   POZOR: JDK 17 nenalezeno - build muze selhat.)

echo.
echo === [4/6] Priprava prostredi (.env) a pnpm ===
copy /y "packages\app-lib\.env.prod" "packages\app-lib\.env" >nul
REM pnpm via npm (recent Node no longer bundles corepack)
set "PATH=%APPDATA%\npm;%PATH%"
where pnpm >nul 2>&1 || call npm install -g pnpm@10.33.2

echo.
echo === [5/6] Instalace zavislosti (pnpm install) ===
call pnpm install
if errorlevel 1 (echo pnpm install selhal. & pause & exit /b 1)

echo.
echo === [6/6] Sestaveni Minekube Launcheru (muze trvat) ===
call pnpm --filter=@modrinth/app run tauri build --bundles nsis
if errorlevel 1 (echo Build selhal - viz vypis vyse. & pause & exit /b 1)

echo.
echo ============================================================
echo   HOTOVO! Instalator najdes zde:
echo   target\release\bundle\nsis\
echo ============================================================
if exist "target\release\bundle\nsis" start "" "target\release\bundle\nsis"
pause
