<#
  One-click Debug APK build (Windows PowerShell)
  Prereqs:
    - Node.js (npm, npx)
    - JDK 17 (JAVA_HOME points to JDK17)
    - Android SDK (cmdline-tools, platform-tools, build-tools, platforms)
    - sdkmanager --licenses accepted; build-tools/platforms installed (35 or 34)
  Notes:
    - This script only sets env vars for current process
#>

param()

$ErrorActionPreference = 'Stop'

function Fail($msg) {
	Write-Host "[FAIL] $msg" -ForegroundColor Red
	exit 1
}

function Info($msg) {
	Write-Host "[INFO] $msg" -ForegroundColor Cyan
}

# Repo root (parent of scripts/)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
Set-Location $RepoRoot

Info "Repo root: $RepoRoot"

# 1) Setup JDK/SDK env
$JdkHome = $env:JAVA_HOME
if ([string]::IsNullOrWhiteSpace($JdkHome)) {
	# Fallback default path (adjust if needed)
	$DefaultJdk = 'E:\jdk\jdk-17.0.17+10'
	if (Test-Path $DefaultJdk) {
		$JdkHome = $DefaultJdk
	}
}
if ([string]::IsNullOrWhiteSpace($JdkHome) -or -not (Test-Path $JdkHome)) {
	Fail "JDK 17 not found. Install JDK17 and set JAVA_HOME (e.g. E:\jdk\jdk-17.0.17+10)."
}

Info "Using JDK: $JdkHome"

$env:JAVA_HOME = $JdkHome
$env:Path = "$($env:JAVA_HOME)\bin;$($env:Path)"

$SdkRoot = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } elseif ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { 'E:\Android\sdk' }
if (-not (Test-Path $SdkRoot)) {
	Fail "Android SDK not found at: $SdkRoot. Install SDK or set ANDROID_SDK_ROOT/ANDROID_HOME."
}

$env:ANDROID_SDK_ROOT = $SdkRoot
$env:ANDROID_HOME = $SdkRoot

Info "Using ANDROID_SDK_ROOT: $SdkRoot"

# 2) Ensure android/local.properties sdk.dir
$LocalProps = Join-Path $RepoRoot 'android\local.properties'
if (-not (Test-Path $LocalProps)) {
	Info "Write android\local.properties"
	"sdk.dir=$($SdkRoot -replace '\\','\\')" -replace ':','\:' | Set-Content -Encoding ASCII $LocalProps
} else {
	# Simple check; do not overwrite blindly
	$lp = Get-Content $LocalProps -ErrorAction SilentlyContinue | Out-String
	if ($lp -notmatch 'sdk\.dir=') {
		Info "Update sdk.dir in android\local.properties"
		"sdk.dir=$($SdkRoot -replace '\\','\\')" -replace ':','\:' | Set-Content -Encoding ASCII $LocalProps
	}
}

# 3) Front-end build and sync
Info "Build web assets (npm run build)"
npm run build | Write-Host

Info "Sync assets to native (npx cap copy)"
npx cap copy | Write-Host

# 4) Gradle Debug APK
$AndroidDir = Join-Path $RepoRoot 'android'
Set-Location $AndroidDir

Info "Gradle assembleDebug"
.\gradlew.bat --no-daemon assembleDebug | Write-Host

# 5) Output and copy APK
$ApkSrc = Join-Path $AndroidDir 'app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path $ApkSrc)) {
	Fail "APK not found: $ApkSrc"
}

$OutDir = Join-Path $RepoRoot 'dist\apk'
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }
$ApkDst = Join-Path $OutDir 'FreeChat-debug.apk'
Copy-Item -Force $ApkSrc $ApkDst

Info "APK built:"
Write-Host " - Source: $ApkSrc" -ForegroundColor Green
Write-Host " - Copy:   $ApkDst" -ForegroundColor Green

exit 0


