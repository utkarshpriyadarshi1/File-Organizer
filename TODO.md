# File Organizer Task Checklist

A tracker of achievements and pending milestones for the File Organizer system.

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
- [ ] Custom Folder Layout Rules in Preferences
- [ ] Website: www.updev.in
- [ ] Project Name: File Organizer
- [ ] Tagline: Clean and Organize your Files
- [ ] Documentation Reference - Architecture Overview,  Database Schema, Technical Specification, Feature Catalog, Development Phases, Changelog
- [ ] 
--- General Objective

**Role & Objective:**
You are an Expert Software Architect and Lead Developer. Your task is to analyze, refactor, and structure my project according to my strict "Standardized Project Management Pattern." You will guide me through refactoring my codebase, generating the necessary scripts, and fulfilling every item on the application checklist.

Please review the following standards and apply them to the codebase or project details I provide.

- [ ]  1. Centralized Configuration

The application must rely on a root-level `app.config.json` file. All core application metadata must be dynamically loaded from this single file to prevent hardcoded values across the frontend, backend, and builder scripts. Required fields include:

* Application Name
* Heading
* Subtitle
* Icon Paths
* Version Number

- [ ]  2. Mandatory Directory Architecture

Whenever possible, strictly align the project to the following pattern. If the stack differs (e.g., using Electron instead of Tauri), adapt the specific technology but maintain the structural integrity and folder purposes.

```text
project/
├── app.config.json           # Centralized configuration (app name, heading, subtitle, icons, version)
├── backend/                  # API/Server project (e.g., Spring Boot & SQLite)
│   ├── src/                  # Source files (controller, service, repository, model)
│   ├── sql/                  # Database table schema setups
│   └── pom.xml               # Dependency configuration
├── frontend/                 # Desktop shell & UI client (e.g., Tauri & React)
│   ├── src-tauri/            # Desktop wrapper configuration
│   ├── src/                  # UI components (e.g., Tailwind, React)
│   └── package.json          # Node.js configuration
├── builder/                  # Cross-platform build and packaging scripts
│   ├── build.js              # Node.js cross-platform build runner
│   ├── clean.js              # Node.js cross-platform workspace cleaner
│   ├── build.bat / build.sh  # OS-specific production packagers
│   ├── clean.bat / clean.sh  # OS-specific workspace cleaners
│   ├── increment_version.py  # Automation tool for version bumps
│   └── setup-cert.ps1        # Self-signed code signing certificate generator
├── docs/                     # Architecture & user documentation
│   ├── help/                 # .md files linked directly to the application's help section
│   ├── changelog.md          # Version changes and release notes
│   ├── architecture-overview.md
│   ├── database-schema.md
│   ├── development-phases.md
│   └── scalability-deployment.md
├── schema/                   # Database initialization models
│   ├── data.sql              # Static assets, demo data, and template data
│   └── schema.sql            # Core table schema
├── build.bat / build.sh      # Root wrapper scripts for packaging (delegators)
├── clean.bat / clean.sh      # Root wrapper scripts for workspace cleanup (delegators)
├── dev.bat / dev.sh          # One-click concurrent environment launchers
└── TODO.md                   # Pending tasks and achievements tracker

```

- [ ]  3. Application UI & Feature Checklist

Ensure the frontend implementation satisfies the following requirements:

* **Top-Right Navigation:** Must include buttons for Day/Night theme toggle, Preferences/Settings, Console Log view, and a Help section.
* **Preferences/Settings View:** Must display cache statistics and include functional cache-cleaning buttons.
* **Help Section:** Must feature a GitHub issue/bug reporting button and contain tab/section-specific guidelines pulled from the `docs/help` directory.
* **Internationalization (i18n):** Must support at least English and Hindi.
* **Iconography:** Install and use the Font Awesome Free package exclusively. Remove all text labels and tooltips, relying on exact matching icon names for a clean UI.
* **Core Documentation:** Explicitly list all supported platforms/devices, clarify if it is a standalone app, web portal, or both, and detail all core features.

- [ ]  4. Codebase Refactoring & UI Updates

* **Naming Conventions:** Rename and refactor folder, file, and variable names across the codebase to be highly intuitive and directly descriptive of their functions.
* **Asset Migration:** Strip out all legacy icons and implement Font Awesome icons universally.

- [ ]  5. Build, Packaging & Distribution

* **Version Control:** Ensure every production-ready build automatically registers and bumps the new app version (utilizing `increment_version.py`).
* **Builder Directory:** Route all cross-platform build scripts, packaging tools, and workspace cleaners through the dedicated `builder` directory.
* **Security:** Generate and apply a self-signed certificate for the application via the included setup script.

- [ ]  6. Quick Start & Development Setup

* **Root Scripts:** Provide root-level wrapper scripts (`dev`, `build`, `clean`) to trigger the inner `builder` scripts easily.
* **Developer Onboarding:** Create a comprehensive, automated setup script and document a step-by-step launch process for concurrent development (e.g., spinning up frontend and backend simultaneously).
* **Workspace Maintenance:** Provide steps or scripts for cleanly wiping the workspace of build artifacts.

- [ ]  7. Documentation & Open Source Readiness

* **Audit:** Review all markdown files in the `docs` folder to ensure they reflect the current state of the app.
* **Polish:** Ensure the repository, `TODO.md`, and changelogs are clean, professional, and ready for public open-source release
