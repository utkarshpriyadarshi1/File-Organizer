# Changelog

All notable changes to the **File Organizer** project will be documented in this file.

## [0.0.7] - 2026-06-24
### Refactored
- Renamed project name, folder, file, and variable configurations from **e-abhilekh** to **File Organizer**.
- Reorganized Java backend source directories and package namespace layout from `com.updevlogics.eabhilekh` to `in.updev.fileorganizer`.
- Renamed SQLite database configuration to `file-organizer.db` and updated AppData folders to `%USERPROFILE%/AppData/Local/file-organizer`.
- Updated code-signing scripts `setup-cert.ps1` and `sign-app.ps1` to produce and utilize `file-organizer-cert.pfx` certificate.
- Refactored frontend views (`Overview.jsx`, `Logs.jsx`, `Help.jsx`, `App.test.js`), manifest descriptors, and package settings to align with the new branding.

## [0.0.3] - 2026-06-14
### Added
- Root-level centralized configuration `app.config.json` defining core app parameters.
- Structured build system folder `builder/` housing cross-platform packaging, version bumping, and self-signed code-signing cert scripts.
- Root wrapper scripts (`dev.bat`, `build.bat`, `clean.bat`, `setup.bat`) for easy developer onboarding.
- Local Font Awesome Free iconography support offline.
- Dynamic help section rendering markdown files from `docs/help` via Electron IPC.

### Changed
- Reorganized codebase directories following standard management layout, removing legacy packaging folders.
- Refactored `VersionInitializer.java` to read configurations directly from `app.config.json`.
