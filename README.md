# FBOSS: File Backup Organizer Secure Searchable Monorepo

Welcome to the **FBOSS** standalone monorepo. This repository contains the full-stack architecture for organizing, backing up, deduplicating, and locally storing files and documents securely offline.

## Project Structure

The project has been flattened and restructured into a clean layout:

```
fboss/
├── backend/            # Spring Boot REST API & WebSocket progress server
│   ├── src/            # Java source files (Service, Controller, Entity, Repository)
│   ├── pom.xml         # Maven configuration
│   └── Dockerfile      # Multi-stage production container build
├── frontend/           # React frontend wrapped with Electron shell
│   ├── src/            # React views and component logic
│   ├── public/         # Static assets and template HTML
│   └── package.json    # Node.js dependencies and script configs
├── docs/               # Architecture and development manuals
│   ├── architecture-overview.md
│   ├── database-schema.md
│   ├── development-phases.md
│   ├── scalability-deployment.md
│   └── boilerplate-setup.md
├── schema/             # Core database schema scripts
│   └── fboss_schema.sql # SQLite database schema definitions
```

---

## Getting Started

The project runs completely standalone offline with zero external dependencies (no Docker or external Redis required).

### 1. Backend Server (Spring Boot)
Build and run the Java backend using your IDE or Maven. It runs fully local out-of-the-box using an in-memory task queue/cache and the SQLite file-based database driver (creating a local `fboss.db` file in the working directory).

### 2. Frontend & Electron Shell (React)
Navigate to the frontend folder, install dependencies, and launch the development environment:
```bash
cd frontend
npm install
npm run dev
```
*This command concurrently starts the React development server at `http://localhost:3000` and launches the Electron window.*

---

## Core Features
- **File Organizer**: Recursive directory walk, categorization, sorting, and tag association.
- **Duplicate Hashing**: Fast SHA-256 chunked hashing with database caching to skip hashing unmodified files.
- **SQLite Write Queue**: Serialized background DB write queue preventing multi-thread file-locking issues.
- **WebSocket Progress Updates**: Real-time backup, duplicate removal, and file organizing progress reporting.
