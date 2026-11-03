-- SQLite Database Schema for File Organizer (File Organizer Desktop App)

-- 1. Files table: Stores core file properties and metadata.
CREATE TABLE IF NOT EXISTS files (
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

CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
CREATE INDEX IF NOT EXISTS idx_files_subcategory ON files(subcategory);
CREATE INDEX IF NOT EXISTS idx_files_active_path ON files(is_active, path);
CREATE INDEX IF NOT EXISTS idx_files_size ON files(size);

-- 2. File Hashes table: For duplicate detection.
CREATE TABLE IF NOT EXISTS file_hashes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    hash TEXT NOT NULL,
    hash_type TEXT NOT NULL,
    indexed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_file_hashes_hash_type ON file_hashes(hash, hash_type);
CREATE INDEX IF NOT EXISTS idx_file_hashes_file_id ON file_hashes(file_id);

-- 3. Tags table: Supports user-defined tags.
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

-- 4. File Tags table: Many-to-many relationship mapping files to tags.
CREATE TABLE IF NOT EXISTS file_tags (
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (file_id, tag_id)
);

-- 5. Backup Jobs table: Defines backup jobs and status.
CREATE TABLE IF NOT EXISTS backup_jobs (
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

-- 6. Sync Jobs table: Defines synchronization jobs and status.
CREATE TABLE IF NOT EXISTS sync_jobs (
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

-- 7. File Versions table: Tracks historical backup versions of files.
CREATE TABLE IF NOT EXISTS file_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    backup_job_id INTEGER REFERENCES backup_jobs(id) ON DELETE SET NULL,
    version_number INTEGER NOT NULL,
    backup_path TEXT NOT NULL,
    backed_up_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Activity Log table: Audits user actions and system operations.
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT NOT NULL,
    file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    details TEXT
);

CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp);

-- 9. Background Tasks table: Tracks running, queued, and historical jobs.
CREATE TABLE IF NOT EXISTS background_tasks (
    id TEXT PRIMARY KEY,
    task_type TEXT NOT NULL,
    status TEXT NOT NULL,
    summary TEXT NOT NULL,
    report_file_path TEXT,
    source_path TEXT,
    destination_path TEXT,
    action_details TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    execution_time_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_bgtask_status ON background_tasks(status);
CREATE INDEX IF NOT EXISTS idx_bgtask_type ON background_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_bgtask_created ON background_tasks(created_at);

-- 10. Analysis File Records table: High-speed disk analysis breakdown.
CREATE TABLE IF NOT EXISTS analysis_file_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    category TEXT NOT NULL,
    file_path TEXT NOT NULL,
    size INTEGER NOT NULL,
    modified_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_analysis_task_cat ON analysis_file_records(task_id, category);
CREATE INDEX IF NOT EXISTS idx_analysis_task_size ON analysis_file_records(task_id, size);

-- 11. File Reversals table: Undo history.
CREATE TABLE IF NOT EXISTS file_reversals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    source_path TEXT NOT NULL,
    original_path TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reversals_task ON file_reversals(task_id);
CREATE INDEX IF NOT EXISTS idx_reversals_src ON file_reversals(source_path);

-- 12. App Settings table: Configuration key-value store.
CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT
);

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- 13. Error Logs table: System-wide diagnostics and crash logs.
CREATE TABLE IF NOT EXISTS error_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service TEXT,
    message TEXT,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);

-- 14. Ignore Rules table: Patterns skipped during operations.
CREATE TABLE IF NOT EXISTS ignore_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern TEXT NOT NULL
);

-- 15. Registered Versions table: Version history.
CREATE TABLE IF NOT EXISTS registered_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL,
    registered_at TEXT NOT NULL
);
