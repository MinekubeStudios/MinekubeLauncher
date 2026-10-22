# ============================================================
#  Minekube Launcher - one-click Windows build (PowerShell)
#  Spusteni (viz konec / instrukce): pravym -> "Run with PowerShell",
#  nebo v PowerShellu:  powershell -ExecutionPolicy Bypass -File .\build-windows.ps1
#  Pri prvnim spusteni doinstaluje nastroje pres winget a sestavi .exe.
#  Prvni build trva klidne 15-25 minut.
# ============================================================
$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

function Have($name) { [bool](Get-Command $name -ErrorAction SilentlyContinue) }

Write-Host "`n=== [1/6] Kontrola winget ===" -ForegroundColor Cyan
if (-not (Have 'winget')) {
    Write-Host "winget nenalezen. Nainstaluj 'App Installer' z Microsoft Store a spust skript znovu." -ForegroundColor Red
    Read-Host "Enter pro konec"; exit 1
}

Write-Host "`n=== [2/6] Instalace nastroju (preskoci se, co uz mas) ===" -ForegroundColor Cyan
$common = '--accept-source-agreements','--accept-package-agreements','--silent'
winget install -e --id Rustlang.Rustup @common
winget install -e --id OpenJS.NodeJS @common
winget install -e --id EclipseAdoptium.Temurin.17.JDK @common
winget install -e --id Microsoft.EdgeWebView2Runtime @common
Write-Host "  - Visual Studio C++ Build Tools (nutne pro kompilaci)..."
winget install -e --id Microsoft.VisualStudio.2022.BuildTools `
    --accept-source-agreements --accept-package-agreements `
    --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"

Write-Host "`n=== [3/6] Nastaveni cest k nastrojum ===" -ForegroundColor Cyan
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:ProgramFiles\nodejs;$env:Path"
$jdk = Get-ChildItem "$env:ProgramFiles\Eclipse Adoptium" -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue |
        Select-Object -First 1
if ($jdk) { $env:JAVA_HOME = $jdk.FullName; $env:Path = "$($jdk.FullName)\bin;$env:Path" }

if (-not (Have 'cargo')) { Write-Host "Rust/cargo neni na PATH. Restartuj PC a spust skript znovu." -ForegroundColor Red; Read-Host; exit 1 }
if (-not (Have 'node'))  { Write-Host "Node.js neni na PATH. Restartuj PC a spust skript znovu." -ForegroundColor Red; Read-Host; exit 1 }
Write-Host "  cargo: $(cargo --version)"
Write-Host "  node:  $(node --version)"
if ($env:JAVA_HOME) { Write-Host "  java:  $env:JAVA_HOME" } else { Write-Host "  POZOR: JDK 17 nenalezeno - build muze selhat." -ForegroundColor Yellow }

Write-Host "`n=== [4/6] Priprava prostredi (.env) a pnpm ===" -ForegroundColor Cyan
Copy-Item 'packages\app-lib\.env.prod' 'packages\app-lib\.env' -Force
# pnpm via npm (recent Node no longer bundles corepack)
$env:Path = "$env:APPDATA\npm;$env:Path"
if (-not (Have 'pnpm')) { npm install -g pnpm@10.33.2 }

Write-Host "`n=== [5/6] Instalace zavislosti (pnpm install) ===" -ForegroundColor Cyan
pnpm install
if ($LASTEXITCODE -ne 0) { Write-Host "pnpm install selhal." -ForegroundColor Red; Read-Host; exit 1 }

Write-Host "`n=== [6/6] Sestaveni Minekube Launcheru (muze trvat) ===" -ForegroundColor Cyan
pnpm --filter=@modrinth/app run tauri build --bundles nsis
if ($LASTEXITCODE -ne 0) { Write-Host "Build selhal - viz vypis vyse." -ForegroundColor Red; Read-Host; exit 1 }

$out = Join-Path $PSScriptRoot 'target\release\bundle\nsis'
Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  HOTOVO! Instalator najdes zde:" -ForegroundColor Green
Write-Host "  $out" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
if (Test-Path $out) { Start-Process $out }
Read-Host "Enter pro konec"
