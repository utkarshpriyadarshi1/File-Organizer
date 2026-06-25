# File Organizer: Architecture Overview

## Overview

**File Organizer** is an offline, standalone desktop application optimized specifically for Windows hosts, with no web portal, central servers, or external internet dependencies. It provides local-only file organizing, incremental backup, deduplication, and a password-protected Document Locker with rich categorization—all processed locally on-device for maximum security and privacy at scale.

---

## Key Features

- **File Organizer:** Browse, tag, move, and edit file attributes with fully reversible (undoable) actions.
- **Duplicate Cleaning:** Detect and remove duplicate files via fast hashing with live progress and selection.
- **Deep Cleaning:** Identify and clean redundant, large, or rarely used files.
- **Incremental Backup:** Efficiently back up only changed or new files, verifying integrity post-backup.
- **Sync:** One-way and two-way folder synchronization with conflict handling and task progress display.
- **Restore:** Granular and full restore options, with preview and alternate path support.
- **Document Locker:** Upload, categorize, and search documents using user-supplied metadata and system attributes.
- **Task & Cache Settings:** Detailed panel to monitor active tasks, force-cancel queued/running tasks (bulk or partial), and prune finished cache directories folder-wise.
- **Security:** Local encryption (AES-CBC), permission checks, and audit logs.
- **Accessibility:** Multi-language support and accessibility options bundled.

---

## Optimized Database Schema (SQLite)

### 1. `files`
Stores core file properties and metadata.
```sql
CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    type TEXT,
    created_at TEXT,
    modified_at TEXT,
    title TEXT,
    description TEXT,
    category TEXT,
    subcategory TEXT,
    is_active INTEGER DEFAULT 1
);
CREATE INDEX idx_files_path ON files(path);
CREATE INDEX idx_files_name ON files(name);
CREATE INDEX idx_files_category ON files(category);
CREATE INDEX idx_files_subcategory ON files(subcategory);
```

### 2. `file_hashes`
For duplicate detection.
```sql
CREATE TABLE file_hashes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    hash TEXT NOT NULL,
    hash_type TEXT NOT NULL,
    indexed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uq_file_hashes_hash_type ON file_hashes(hash, hash_type);
CREATE INDEX idx_file_hashes_file_id ON file_hashes(file_id);
```

### 3. `tags` and `file_tags`
Supports user-defined tags and many-to-many file-tag relationships.
```sql
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);
CREATE TABLE file_tags (
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (file_id, tag_id)
);
```

### 4. `file_versions`
Backup version tracking.
```sql
CREATE TABLE file_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    backup_job_id INTEGER REFERENCES backup_jobs(id) ON DELETE SET NULL,
    version_number INTEGER NOT NULL,
    backup_path TEXT NOT NULL,
    backed_up_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 5. `backup_jobs` and `sync_jobs`
Job definitions.
```sql
CREATE TABLE backup_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_name TEXT NOT NULL,
    job_type TEXT NOT NULL,
    source_path TEXT NOT NULL,
    destination_path TEXT NOT NULL,
    schedule TEXT,
    status TEXT,
    last_run TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sync_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_name TEXT NOT NULL,
    source_path TEXT NOT NULL,
    destination_path TEXT NOT NULL,
    sync_type TEXT NOT NULL,
    schedule TEXT,
    status TEXT,
    last_run TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 6. `background_tasks`
Tracks execution status, summary, and report locations for all operations.
```sql
CREATE TABLE background_tasks (
    id TEXT PRIMARY KEY,
    task_type TEXT NOT NULL,       -- 'DUPLICATE_SCAN', 'BACKUP', 'SYNC', 'ORGANIZE', 'REVERSAL'
    status TEXT NOT NULL,          -- 'QUEUED', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_FAILURES', 'FAILED', 'CANCELED'
    summary TEXT NOT NULL,         -- e.g. "Scanned 1200 files, 5 duplicates found"
    report_file_path TEXT,         -- Points to AppData/Local/file-organizer/reports/{taskId}.json
    created_at TEXT NOT NULL,
    completed_at TEXT
);
```

### 7. `file_reversals`
Logs file-level mutations to enable granular undo commands.
```sql
CREATE TABLE file_reversals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL REFERENCES background_tasks(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL,  -- 'MOVE', 'COPY', 'DELETE'
    source_path TEXT NOT NULL,      -- Current location of file
    original_path TEXT NOT NULL,    -- Original location (for undo target)
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 8. `activity_log`
Auditing and troubleshooting.
```sql
CREATE TABLE activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT NOT NULL,
    file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    details TEXT
);
CREATE INDEX idx_activity_log_timestamp ON activity_log(timestamp);
```

---

## In-Memory Cache Structure (Optimized Caching)

To maintain a 100% offline workflow with zero setup overhead, File Organizer implements an in-memory cache (`RedisCacheService`) using Java `ConcurrentHashMap` collections. The cache keys are structured using standard Redis-like namespacing concepts for fast retrieval:

- **`file:{file_id}`:** Bounded map of hot file metadata (path, name, size, type, tags) for fast detail rendering.
- **`hash:{hash_value}`:** Set of file IDs sharing the same hash value, optimized for duplicate detection.
- **`tag:{tag_name}:files`:** Set of file IDs associated with a specific tag.
- **`task_queue`:** In-memory queue of pending tasks awaiting worker threads.
- **`task:{task_id}:cancel`:** Flag indicating a task has received a force-cancel signal.
- **`task:{task_id}:processed`:** In-memory counter tracking real-time progress of files processed by a task.
- **`task:{task_id}:total`:** In-memory count of total files discovered for a specific task.
- **`task:{task_id}:temp_results`:** Buffer list accumulating task file actions before they are flushed to SQLite during checkpoints.

---

## Optimized Core Steps & Flows

### 1. Hybrid Task Execution & Checkpointing
- Background workers perform directory scanning, hashing, or copying at memory speed, writing progress counters directly to the in-memory cache.
- At checkpoint intervals (**every 500 files or every 30 seconds**, whichever is met earlier), the workers flush accumulated results to SQLite using the serialized `SqliteWriteQueueService`.
- Upon completion, the detailed execution payload is written to `reports/{taskId}.json` on disk, leaving a summary in the SQLite DB.

### 2. Task Cancellation & Force-Shutdown
- Users can view running and queued tasks. They can select multiple running/pending tasks and hit **"Force Cancel"**.
- Queued tasks are immediately removed from the local execution queue.
- Running tasks detect the cancellation flag (`task:{taskId}:cancel` state) in their loops, immediately throw a cancellation exception, exit cleanly, release pool slots, and log a `CANCELED` status in SQLite.

### 3. Reversal (Undo) Aggression & Error Recovery
- Undoing moves or restorations proceeds aggressively without pre-flight blocks.
- If a file is locked or missing, it is **skipped** and logged as a failure in the task report. The job concludes as `COMPLETED_WITH_FAILURES`.
- The user is presented with the failures list in the UI and can click **"Retry Failed Reversals"** once the file is unlocked.

### 4. Cache Cleanup Policies
- Cache directory cleaning in Settings is limited **only to completed task reports**.
- Pending and active task files are listed with active statistics (size/file count) but block deletion requests.

---

## Unified Generic Services Architecture

To modularize the codebase, operations are divided into seven generic services:

1. **`BackgroundTaskManager`:** Orchestrates the worker threads, manages the local task execution queue, triggers checkpoints, and commits results.
2. **`TaskCancellationManager`:** Registers and queries cancellation indicators in the in-memory cache and evicts queued tasks.
3. **`DirectoryStatsProvider`:** Asynchronously monitors AppData folders to return sizes, counts, and modified dates folder-wise.
4. **`FilePurgeService`:** Sweeps AppData cache folders, verifying lock exemptions and active task exclusions.
5. **`SecureStorageService`:** Performs file copying, moving, and deleting, with optional AES-CBC encryption and post-copy SHA-256 validation.
6. **`FileScannerService`:** Walks directory trees, indexing metadata to SQLite and caches in Redis.
7. **`ReportSerializationService`:** Manages writing and reading task JSON logs to the file system.
