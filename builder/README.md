# Production Builder & Code Signing

This directory contains utility scripts to automate production compilation and code-signing of the **File Organizer** desktop application deliverables using a self-signed developer certificate.

## Scripts Directory

*   **`setup-cert.ps1`**: A PowerShell script that generates a self-signed code signing certificate and exports it to `file-organizer-cert.pfx`.
*   **`sign-app.bat`**: Locates `signtool.exe` in the Windows SDK directory and signs the target executable or JAR file.
*   **`package-app-signed.bat`**: The complete production build workflow. It bumps versioning, builds React assets, compiles the Spring Boot backend JAR, and signs the resulting files.

## Trusting the Self-Signed Certificate Locally

To prevent Windows SmartScreen from displaying warnings when installing or running the signed executables, you should trust the certificate on your local developer machine:

1.  Right-click `file-organizer-cert.pfx` and select **Install PFX** (or double-click the file).
2.  Select **Local Machine** as the Store Location and click Next.
3.  Confirm the file path and click Next.
4.  Enter the password: **`Organizer2026!`** and click Next.
5.  Select **Place all certificates in the following store**.
6.  Click **Browse...** and select **Trusted Root Certification Authorities**.
7.  Click OK, Next, and then **Finish**.

Once completed, Windows will trust any binaries signed with this certificate.

## Verification & Troubleshooting

To manually verify that a binary has been signed successfully, run the following command in a cmd/PowerShell terminal containing Windows SDK tools:

```cmd
signtool verify /pa /v backend\target\file-organizer-0.0.7-SNAPSHOT.jar
```

Alternatively, right-click the signed `.exe` file in Windows Explorer, select **Properties**, and check if a **Digital Signatures** tab is present.
