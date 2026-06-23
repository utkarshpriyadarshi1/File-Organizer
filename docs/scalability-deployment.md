# File Organizer Scalability and Deployment Strategies

### Scalability Strategies

**File Organizer** is engineered to manage millions of files and metadata entries efficiently while maintaining fast performance and high UI responsiveness. Here are the core scalability and resource optimization strategies:

---

#### 1. Hybrid SQLite-Cache Task Flow
* **In-Memory Buffering:** During intensive file actions (scanning, hashing, copying, restoring), workers write real-time progress counters and temporary results lists directly to the in-memory cache (`RedisCacheService`).
* **Checkpointing (Lock Prevention):** To prevent SQLite database write locks (`SQLITE_BUSY`), the accumulated cached task logs are flushed to SQLite in a single transaction only when:
  * **500 files** have been processed, **OR**
  * **30 seconds** have elapsed since the last flush.
* **Externalized JSON Reports:** Instead of saving long arrays of file changes in database rows (which causes SQLite bloating), detailed execution payloads are written as `.json` files under `AppData/Local/file-organizer/reports/`. SQLite only holds task summaries and report file pointers.

---

#### 2. Persistent Task Queuing & Concurrency Control
* **In-Memory Task Queue:** Submitted tasks are registered in a thread-safe task queue in memory.
* **Gated Execution:** A concurrency limit (e.g. `MAX_CONCURRENT_TASKS = 2`) ensures that worker threads only pop tasks when slots open, protecting host file systems and CPU loads from starvation.
* **Non-Blocking Execution:** The UI offloads long runs to a background drawer, allowing users to navigate and perform lightweight database operations (like browsing locker files) concurrently.

---

#### 3. Task Cancellation & Interrupt Checkpoints
* **Interrupt Flags:** Active tasks read a cancel indicator (`task:{id}:cancel`) in their file processing loops.
* **Fast Halting:** When triggered, tasks stop processing files immediately, clean up open file streams, evict queued entries from the local memory queue, and log a `CANCELED` state in SQLite.

---

#### 4. Active Settings & Storage Management
* **Completed Cache Cleanup:** Settings panel enables clearing task report JSONs, diagnostics, and temporary decryption folder files to recover disk space on storage-constrained environments.
* **Active Protection:** Deleting reports associated with active/queued tasks is blocked in the API, showing live file usage sizes and file count statistics instead.

---

### Deployment Strategies

File Organizer is designed and engineered as a **100% offline, standalone desktop application**. There is no web portal, centralized API, or cloud service hosting. All user operations, metadata indexing, and document encryption occur locally on the user's host machine. The default deployment target and automated build script setup is optimized specifically for **Windows environments (Windows 10 & 11)**. Here is how deployment and environment requirements are met:

---

#### 1. Standalone Packaging
- **Bundled Installer:**
    - Package all dependencies (JRE/Java runtime, Electron desktop shell, SQLite engine, system binaries, language sets) into a single installer (`.msi` or `.exe`).
    - Ensure the installer configures and spins up the application environment locally on boot, requiring zero external server configuration or internet connections.
- **Portable Mode:**
    - Allow users to deploy File Organizer from external volumes (e.g. USB flash drives), saving configuration and database files inside a relative `./data/` folder for true portability.

#### 2. Settings & Clean-Up Routines
- **System Detection:** On first start, detect host CPU cores, RAM capacities, and disk volumes to set default concurrency ceilings.
- **Auto-Purging:** Schedule a background process to automatically clear AppData cache files and task reports older than 30 days.

---

### Summary Table: File Organizer Scalability & Deployment

| Area | Strategy |
| :-- | :-- |
| **Data Storage** | Hybrid SQLite + Cache, chunked checkpointing (500 files / 30s), externalized JSON reports, composite indexing. |
| **Task Control** | In-memory task queue (FIFO), concurrent worker pools, non-blocking UI task drawer. |
| **Task Cancellation** | Live interrupt check loops, bulk cancel REST endpoints, instant queue eviction. |
| **Cache Management** | Folder-wise completed cache purge, active stats display, active report protection, 30-day auto-purge. |
| **Local Operation** | Fully offline-first, no external API gateways, portable USB deployment option. |
| **Packaging** | Bounded local scripts (`packaging/` folder) for automated builds on Windows and Linux/macOS. Bundled installers contain SQLite, JRE, and the Electron executable. |
