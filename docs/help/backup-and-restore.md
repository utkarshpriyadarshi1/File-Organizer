# Backup & Restore Guide

The **Backup & Restore** engine processes local backup jobs using incremental diffing and post-copy SHA-256 integrity validation.

### 🌟 Key Features
- **Incremental Copies:** Compares file content hashes to copy only modified or newly created documents.
- **SHA-256 Validation:** Performs a post-copy hash matching routine to guarantee zero file corruption.
- **Granular Restoration:** Restore individual versions from history or full directories from target archives.

### 🚀 How to Use
1. Select the **Backup & Restore** tab in the sidebar.
2. Configure your backup source and destination directory path.
3. Click **Start Backup** to launch the job. The progress will stream live in your monitoring task drawer.
4. To restore, select a past backup run or supply a zipped package, and choose your restoration path.
