# FBO App: SQLite Database Schema

Below is the optimized schema for the File Backup & Organizer (FBO) app, designed to efficiently handle millions of files, metadata, hashes, backup versions, and task audits sequentially.

---

### 1. **files**
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

### 2. **file_hashes**
Stores file hashes for duplicate detection.
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

### 3. **tags** & **file_tags**
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

### 4. **file_versions**
Tracks backup versions and history for each file.
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

### 5. **backup_jobs**
Defines backup jobs, schedules, and status.
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
```

### 6. **sync_jobs**
Defines synchronization jobs and their status.
```sql
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

### 7. **background_tasks**
Tracks background execution status, summaries, and external report paths.
```sql
CREATE TABLE background_tasks (
    id TEXT PRIMARY KEY,
    task_type TEXT NOT NULL,       -- 'DUPLICATE_SCAN', 'BACKUP', 'SYNC', 'ORGANIZE', 'REVERSAL'
    status TEXT NOT NULL,          -- 'QUEUED', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_FAILURES', 'FAILED', 'CANCELED'
    summary TEXT NOT NULL,         -- Short description of the run outcomes
    report_file_path TEXT,         -- Path to external reports (Local AppData JSON)
    created_at TEXT NOT NULL,
    completed_at TEXT
);
```

### 8. **file_reversals**
Logs file movement/mutation mappings for undo triggers.
```sql
CREATE TABLE file_reversals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL REFERENCES background_tasks(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL,  -- 'MOVE', 'COPY', 'DELETE'
    source_path TEXT NOT NULL,      -- Current path
    original_path TEXT NOT NULL,    -- Original location (target for reversal)
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 9. **activity_log**
Records all major actions for auditing and troubleshooting.
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

## **Indexing and Performance Notes**
- SQLite indexes are optimized for fast path and metadata lookups.
- Foreign keys are configured to maintain database references cleanly.
- Intermediate execution progress is captured in Redis; SQLite updates occur sequentially via the `SqliteWriteQueueService` at checkpoint intervals (every 500 files or 30 seconds) to avoid database lock exceptions (`SQLITE_BUSY`).
- File-level transaction reports are externalized in `.json` files to protect the database from bloating.
