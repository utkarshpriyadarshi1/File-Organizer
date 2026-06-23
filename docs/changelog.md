# Changelog

All notable changes to the **File Organizer** project will be documented in this file.

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
