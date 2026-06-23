# setup-cert.ps1
# Automates Windows self-signed code signing certificate setup for Electron packaging.

$ErrorActionPreference = "Stop"

# Change to root directory of project relative to script location
Set-Location "$PSScriptRoot\.."

# 1. Load configuration and determine certificate subject
$configPath = Join-Path (Get-Location) "app.config.json"
$appName = "file-organizer"
if (Test-Path $configPath) {
    $config = Get-Content -Raw -Path $configPath | ConvertFrom-Json
    if ($null -ne $config.appName) {
        $appName = $config.appName
    }
}
$subject = "CN=$appName Self Signed Dev"
$friendlyName = "$appName Developer Certificate"

Write-Host "Searching for existing $appName Code Signing certificate..."
$cert = Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object { $_.Subject -eq $subject } | Select-Object -First 1

if ($null -eq $cert) {
    Write-Host "No existing certificate found. Generating a new self-signed Code Signing certificate..."
    $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject $subject -FriendlyName $friendlyName -CertStoreLocation "Cert:\CurrentUser\My" -NotAfter (Get-Date).AddYears(5)
    Write-Host "Successfully generated certificate with Thumbprint: $($cert.Thumbprint)"
} else {
    Write-Host "Found existing certificate with Thumbprint: $($cert.Thumbprint)"
}

# 2. Export certificate to builder\file-organizer-cert.pfx
$pfxPath = Join-Path $PSScriptRoot "file-organizer-cert.pfx"
$password = ConvertTo-SecureString "Organizer2026!" -AsPlainText -Force
Write-Host "Exporting certificate to $pfxPath..."
if (Test-Path $pfxPath) {
    Remove-Item $pfxPath -Force
}
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password | Out-Null
Write-Host "Successfully exported certificate PFX."

Write-Host "$appName certificate configuration completed successfully!"
