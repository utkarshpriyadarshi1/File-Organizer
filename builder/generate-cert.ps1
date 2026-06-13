# generate-cert.ps1
# Script to generate a self-signed code signing certificate and export it as PFX

$certName = "e-abhilekh-code-signing"
$pfxPath = "$PSScriptRoot\e-abhilekh-cert.pfx"
$password = ConvertTo-SecureString "Abhilekh2026!" -AsPlainText -Force

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Generating Self-Signed Code-Signing Certificate" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Create self-signed code-signing certificate in User store
try {
    $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=e-abhilekh Self Signed Dev" -KeyLength 2048 -FriendlyName "e-abhilekh Developer Certificate" -NotAfter (Get-Date).AddYears(5) -CertStoreLocation "Cert:\CurrentUser\My"
    Write-Host "[SUCCESS] Self-signed certificate generated." -ForegroundColor Green
    
    # Export certificate to PFX
    Write-Host "Exporting certificate to PFX at: $pfxPath" -ForegroundColor Yellow
    Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password
    Write-Host "[SUCCESS] Exported PFX to $pfxPath" -ForegroundColor Green
} catch {
    Write-Error "Failed to generate or export code-signing certificate: $_"
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Certificate generation complete!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
