# e-abhilekh Task Checklist

A tracker of achievements and pending milestones for the e-abhilekh system.

## Completed Refactoring Milestones
- [x] **Centralized Configuration:** Configured root-level `app.config.json` defining metadata and versions.
- [x] **Standard Directory Architecture:** Migrated scripts to `builder/`, removed leftover directories, and established clean delegator wrappers at root.
- [x] **Pre-built Windows Certificates:** Created `builder/setup-cert.ps1` to configure and export code-signing PFX certificates.
- [x] **Dynamic Documentation Loader:** Rewrote React `Help.jsx` view to pull tabbed user manuals dynamically from `docs/help` using Electron IPC.
- [x] **Offline Font Awesome:** Installed locally via package dependencies to fully support offline iconography.

## Next Steps / Backlog
- [ ] Add localization for more regional languages.
- [ ] Complete automated verification tests for incremental backups in macOS/Linux environments.
- [ ] Integrate database migration mechanisms inside Spring Boot to sync dynamic changes automatically.
