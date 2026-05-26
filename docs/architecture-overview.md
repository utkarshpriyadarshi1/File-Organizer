<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# FBOSS: File Backup Organizer Secure Searchable Standalone App

## Overview

**FBOSS** is an offline, standalone Windows application for organizing, backing up, deduplicating, and securely storing files and documents. It features advanced search, robust metadata management, incremental backup, and a Document Locker with rich categorization—all optimized for performance and reliability, even at scale.

## Documentation

### Key Features

- **File Organizer:** Browse, tag, move, and edit file attributes.
- **Duplicate Cleaning:** Detect and remove duplicate files via fast hashing.
- **Deep Cleaning:** Identify and clean redundant, large, or rarely used files.
- **Incremental Backup:** Efficiently back up only changed or new files.
- **Sync:** One-way and two-way folder synchronization with conflict handling.
- **Restore:** Granular and full restore options, with preview and alternate path support.
- **Document Locker:** Upload, categorize, and search documents using user-supplied metadata and system attributes.
- **Bulk Operations:** Batch upload, edit, download, and delete.
- **Offline-Only:** No internet required; all data and indexes are local.
- **Security:** Local encryption, permission checks, and audit logs.
- **Accessibility:** Multi-language support and accessibility options bundled.


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

Job definitions and status.

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


### 6. `activity_log`

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


## Redis Cache Structure (Optimized)

- **file:{file_id}:** Hash for hot file metadata (path, name, size, tags, etc.).
- **hash:{hash_value}:** Set of file IDs sharing the same hash.
- **tag:{tag_name}:files:** Set of file IDs for each tag.
- **task_queue:** List of pending background jobs.
- **progress:{task_id}:** Hash or stream for real-time progress.
- **notifications:** Pub/Sub channel for instant UI updates.


## Optimized Core Steps \& Flows

### 1. File Indexing

- Recursively scan directories using a worker pool.
- Gather file metadata and store in batches.
- Only update changed files (incremental indexing).


### 2. Duplicate Detection

- Compute hashes in parallel, reading files in chunks.
- Store hashes in both SQLite (persistent) and Redis (fast lookup).
- Use Redis sets for instant detection and grouping of duplicates.


### 3. Backup

- Perform incremental backups, copying only changed/new files.
- Track versions and backup paths in the database.
- Verify integrity by comparing hashes post-backup.


### 4. Restore

- Allow granular and full restore, with preview and alternate path options.
- Restore previous versions as needed.


### 5. Document Locker

- **Upload:** Users select files, add category, subcategory, title, description, and tags.
- **Search:** Advanced search/filter by any metadata or attribute, with inline preview and batch operations.


### 6. User Experience

- Real-time progress and notifications via Redis.
- Pause/resume support for long operations.
- Bulk actions for upload, edit, download, and delete.
- Accessibility and multi-language options bundled.


## Additional Optimizations

- **Controlled parallelism:** Limit concurrent file operations for stability.
- **Batch operations:** Use bulk inserts/updates for high throughput.
- **Error isolation:** Log and skip problematic files, never halt entire tasks.
- **Automated index/database optimization:** Regularly vacuum and optimize for sustained speed.
- **Local encryption:** Optionally encrypt files and metadata for privacy.
- **No internet dependency:** All features and resources are fully offline and bundled.


## Summary Table: FBOSS Optimization Areas

| Area | Optimization Strategy |
| :-- | :-- |
| Performance | Worker pools, chunked reads, batch DB ops, Redis caching |
| Reliability | Error isolation, retries, atomic writes, hash verification |
| Scalability | Incremental indexing, composite indexes, partitioning |
| Security | Local encryption, permission checks, audit logs |
| Usability | Real-time progress, bulk ops, advanced search/filter |
| Accessibility | Multi-language, offline resources, a11y features |

**FBOSS** is now fully documented, its schema and flows are optimized, and its design aligns with best practices for a robust, offline, and highly searchable file backup and organization solution.

