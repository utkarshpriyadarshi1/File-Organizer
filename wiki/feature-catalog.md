# Feature Catalog - File Organizer

## 1. Automatic File Organizer

The Automatic File Organizer categorizes loose files in a source directory and moves them into a structured catalog in the destination directory.

- **Dynamic Segment-Based Routing**: Files are organized using customizable patterns containing placeholders:
  - `{fileType}`: File MIME class (e.g. `image/png`, `application/pdf`).
  - `{extension}`: Suffix class (e.g. `png`, `pdf`).
  - `{year}`, `{month}`, `{day}`: Last modified timestamps.
  - `{yearMonth}`: Convenient grouping `YYYY-MM`.
- **Integrity Enforcement & Safety**: Files are moved using atomic copy-verify-delete methods.
- **Reversal History**: The database registers every moved path, enabling a polymorphic **Undo** tool to revert changes.



## 3. Duplicate Cleaner

Detects duplicate items on disk to clean up storage.

- **Parallel Scanning**: Walks the tree to group files by size first.
- **Fast Fingerprinting**: Calculates hash checksums only on files matching sizes, optimizing execution times.

---

## 4. Workspace Explorer

An interactive tree browser embedded in the control center UI.

- **Physical Mode**: Directly explores files and directories as they exist on disk.
- **Virtual Preview**: Virtually structures folder paths under layout rules segments before executing actions, allowing immediate visual configuration of presets.
