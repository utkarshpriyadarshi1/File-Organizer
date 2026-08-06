# Advanced Settings & System Monitoring

The File Organizer provides advanced telemetry, database, and system resource management features to ensure stability and control over large operations.

### 🛡️ System Resource Watchdog
Large file operations can strain your computer's resources. Our background Watchdog runs continuously to protect your OS from freezing:
- **RAM Protection:** If your unallocated system RAM drops below 10% (or 100MB), all active file organizations are **automatically paused**.
- **Disk Protection:** If your operating disk drops below 1GB of free space, operations are paused to prevent corruption.
- *Once your system recovers resources, operations will automatically resume.*

### ⏸️ Manual Task Control
You are in complete control of background tasks.
- **Pause/Resume:** Under the **History & Tasks** tab, or via the bottom right **Active Tasks** drawer, you can manually pause any active operation. This will cleanly freeze the process until you decide to resume it.
- **Terminate:** You can immediately terminate operations, reverting any in-progress file transactions safely.

### ⚙️ Custom Folder Layouts
You can design extremely granular folder hierarchies under **Settings -> General Preferences**:
- Use interactive **Token Chips** to build dynamic paths like `{sizeCategory}/{alpha}/{yearMonth}`.
- Supported tokens include alphabetical grouping (`{alpha}`), size buckets (`{sizeCategory}`), and timeframes (`{quarter}`, `{decade}`).
- A real-time **Live Preview** box shows exactly how files will be organized before you run the task.

### 🗄️ Selective Database Pruning
Keep your storage footprint small without losing everything:
- Under **Settings -> Storage & Cache**, use the **Database Records** multi-select dropdown.
- Instead of blanket-clearing history, you can selectively truncate Task History, File Indexes, Operation Reversal Logs, or Audit Events independently.

### 📊 Telemetry & Reporting
Help us improve the app! Under **Settings -> Data & Reporting**, you can manually generate anonymized usage metrics. You can review the JSON payload, copy it, and submit it on GitHub via a secure copy-paste mechanism (no complex automated authentication required).
