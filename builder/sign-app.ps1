# sign-app.ps1
param (
    [string]$targetFile
)

$certPath = Join-Path $PSScriptRoot "e-abhilekh-cert.pfx"
$certPass = "Abhilekh2026!"

if (-not $targetFile) {
    Write-Error "No target file specified. Usage: sign-app.ps1 [path_to_file]"
    exit 1
}

if (-not (Test-Path $targetFile)) {
    Write-Error "Target file not found: $targetFile"
    exit 1
}

if (-not (Test-Path $certPath)) {
    Write-Warning "PFX Certificate not found at $certPath. Generating a new one..."
    & (Join-Path $PSScriptRoot "generate-cert.ps1")
}

if (-not (Test-Path $certPath)) {
    Write-Error "Failed to obtain certificate. Cannot sign app."
    exit 1
}

Write-Host ""
Write-Host "=========================================================="
Write-Host "Code Signing Target: $targetFile"
Write-Host "=========================================================="

# Locate signtool.exe recursively in Windows Kits
Write-Host "Searching for signtool.exe in Windows Kits..."
$sdkPath = Join-Path (Join-Path $env:SystemDrive "Program Files (x86)") "Windows Kits"
$signtool = Get-ChildItem -Path $sdkPath -Filter signtool.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName

if (-not $signtool) {
    Write-Warning "signtool.exe was not found in Windows SDK directories."
    Write-Warning "Please make sure Windows Software Development Kit (SDK) is installed."
    Write-Warning "Skipping signing step..."
    exit 0
}

Write-Host "Using signtool found at: $signtool"

# Execute signtool.exe to sign the binary
try {
    & $signtool sign /f $certPath /p $certPass /fd SHA256 /t http://timestamp.digicert.com $targetFile
    # Check LASTEXITCODE or error
    if ($LASTEXITCODE -eq 0 -or $?) {
        Write-Host "[SUCCESS] File successfully signed: $targetFile" -ForegroundColor Green
    } else {
        Write-Error "Code-signing failed with exit code: $LASTEXITCODE"
    }
} catch {
    Write-Error "Error executing signtool: $_"
    exit 1
}
