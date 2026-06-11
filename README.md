# e-abhilekh: Standalone File Organizer & Offline Backup Desktop App

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows-0078D6.svg?logo=windows&logoColor=white)]()
[![Offline First](https://img.shields.io/badge/Offline--First-100%25-green.svg)]()
[![Architecture: Spring Boot + Electron](https://img.shields.io/badge/Architecture-Spring%20Boot%20%2B%20Electron-brightgreen.svg)]()

Welcome to **e-abhilekh**, a premium, production-ready desktop application designed to catalog, organize, deduplicate, back up, and secure files completely offline. Built as a desktop app wrapping a Spring Boot backend in an Electron shell, e-abhilekh provides maximum data privacy and performance without sending metadata to the cloud.

---

## 💻 Deployment Model & Supported Devices

*   **Deployment Model:** **100% Standalone Offline Desktop Application**. There is no web portal, central server, cloud database, or external hosting required. All indexing, metadata processing, caching, and document encryption occur entirely on the client machine.
*   **Supported Platforms/Devices:** 
    *   **Windows 10 & 11 (x64 / ARM64):** Fully supported. Native Electron shell packaging utilizes Windows APIs, script automation, and file picker dialogues.
    *   **macOS / Linux:** The core Java backend and React web views are cross-platform. However, native packaging scripts (`.bat` files) and standard Electron configurations are currently optimized specifically for **Windows environments**.

---

## 🌟 Key Features

*   **Offline-First & Cloud-Free:** Zero external APIs or cloud synchronization pipelines. Your data remains fully stored on your local disk.
*   **File Organizer:** Walk large directory trees, assign category and custom tags, edit file metadata (titles, descriptions), and perform fully reversible actions (Undo moves/restorations).
*   **Fast Duplicate Detection:** Uses optimized chunked hashing (SHA-256) with local database indexing, allowing it to quickly identify duplicates in folders with millions of files.
*   **Versioned Incremental Backups:** Back up files incrementally (only newly added/modified files) with full metadata persistence and post-copy SHA-256 validation.
*   **Document Locker:** Securely store and search critical documents with password-protected AES-256 local encryption.
*   **Serialized SQLite Database Queue:** Uses a sequential write queue (`SqliteWriteQueueService`) to completely bypass SQLite locking exceptions (`SQLITE_BUSY`) during high-frequency parallel write requests.
*   **In-Memory Simulated Cache:** Features a thread-safe, bounded LRU caching service (`RedisCacheService`) implemented in pure Java memory (`ConcurrentHashMap`) to optimize file scans and tags lookups with zero local installation overhead.
*   **Interactive Task drawer:** Displays real-time progress of jobs (scans, backups, reversions) via WebSockets, allowing user force-cancellations (bulk or individual).

---

## ⚙️ Architecture & Technical Stack

e-abhilekh utilizes a hybrid architecture:

```
┌──────────────────────────────────────────────────────────────────┐
│                      Electron Wrapper Shell                      │
│                                                                  │
│  ┌──────────────────────────────┐      ┌──────────────────────┐  │
│  │       React Frontend         │◀────▶│ Spring Boot Backend  │  │
│  │ (Tailwind CSS, WebSockets)   │ REST │  (Java REST API &    │  │
│  └──────────────────────────────┘  WS  │  WebSocket Server)   │  │
│                                        └──────────┬───────────┘  │
│                                                   │ (I/O & DB)   │
│                                                   ▼              │
│                                        ┌──────────────────────┐  │
│                                        │  SQLite Database     │  │
│                                        │   & Local Caching    │  │
│                                        └──────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

*   **Frontend:** React (TypeScript) + Tailwind CSS + WebSockets.
*   **Wrapper:** Electron (provides native directory/file picker dialogs via IPC).
*   **Backend:** Spring Boot (Java 21) running an embedded Tomcat container.
*   **Database:** SQLite (file-based database driver writing to `e-abhilekh.db`).
*   **Caching & Queueing:** Local in-memory data structures modeled on Redis API schemas for fast key-value lookups.

---

## 📂 Project Structure

```
e-abhilekh/
├── backend/            # Spring Boot REST API & WebSocket progress server
│   ├── src/            # Java source files (Controller, Service, Entity, Repository)
│   ├── pom.xml         # Maven project descriptor
│   └── application.yml # SQLite and connection pool parameters
├── frontend/           # React frontend wrapped in an Electron shell
│   ├── src/            # React components, contexts, and Electron entrypoints
│   ├── public/         # Static assets and template HTML
│   └── package.json    # React & Electron scripts and packages
├── docs/               # Architecture and development manuals
│   ├── architecture-overview.md
│   ├── database-schema.md
│   ├── development-phases.md
│   └── scalability-deployment.md
├── schema/             # Database initialization models
│   └── e-abhilekh_schema.sql
├── packaging/          # Build and environment automation scripts
│   ├── increment_version.py # Automation tool for version bumps
│   ├── run-dev.bat     # Launches development server and Electron shell from root
│   ├── package-app.bat # Packages backend JAR and compiles React for Windows
│   ├── package-app.sh  # Packages backend JAR and compiles React for Linux/macOS
│   └── run-prod.bat    # Runs production compiled assets locally
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed on your machine:
*   **Java Development Kit (JDK) 21** or higher
*   **Apache Maven 3.8+**
*   **Node.js 18+** & **npm**

### Development Mode
To start both the Spring Boot backend server and the Electron application concurrently, run the development script:

```bash
# Execute from project root:
.\packaging\run-dev.bat
```

Alternatively, you can boot them manually in separate terminal windows:

**1. Backend:**
```bash
cd backend
mvn spring-boot:run
```
*The REST API will launch at `http://localhost:8080/api` and WebSockets will bind to `ws://localhost:8080/ws/progress`.*

**2. Frontend:**
```bash
cd frontend
npm install
npm run dev
```
*This starts the React server (port `3000`) and launches Electron pointing to it.*

---

## 📦 Building & Packaging

To compile the application for local production distribution, run the packaging script:

```bash
# On Windows:
.\packaging\package-app.bat

# On Linux or macOS:
chmod +x packaging/package-app.sh
./packaging/package-app.sh
```

This performs the following operations:
1.  **Backend compilation:** Builds a standalone executable JAR inside `backend/target/e-abhilekh-*.jar`.
2.  **Frontend compilation:** Builds minimized static files in `frontend/build/`.
3.  **Local Distribution:** Generates assets ready to run offline.

To test the packaged build, run:
```bash
.\packaging\run-prod.bat
```

---

## 📜 Contributing & Code of Conduct

We welcome all contributions from the community! Before submitting a pull request, please read:
*   [CONTRIBUTING.md](CONTRIBUTING.md) for local guidelines, naming standards, and coding conventions.
*   [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for expectations of conduct in the project workspace.
*   [SECURITY.md](SECURITY.md) if you discover any security vulnerabilities or issues.

---

## 🛡️ License

This project is licensed under the **GNU General Public License v3** - see the [LICENSE](LICENSE) file for details.
