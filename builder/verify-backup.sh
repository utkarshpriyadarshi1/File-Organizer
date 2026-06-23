#!/bin/bash
# automated incremental backup verification test for macOS/Linux environments

set -e

echo "=================================================="
echo " Starting Incremental Backup Verification Test"
echo "=================================================="

# Create temporary sandbox directories
TEST_DIR=$(mktemp -d -t backup-test-XXXXXX)
SRC_DIR="$TEST_DIR/source"
BACKUP_DIR="$TEST_DIR/backup"

mkdir -p "$SRC_DIR"
mkdir -p "$BACKUP_DIR"

echo "Using temp directory: $TEST_DIR"

# 1. Seed initial source files
echo "Step 1: Creating initial source files..."
echo "file 1 content" > "$SRC_DIR/file1.txt"
echo "file 2 content" > "$SRC_DIR/file2.txt"

# 2. First backup run (copies all files)
echo "Step 2: Performing first backup run..."
cp -p "$SRC_DIR"/* "$BACKUP_DIR"/
echo "First backup completed."

# Verify files exist in backup
if [ ! -f "$BACKUP_DIR/file1.txt" ] || [ ! -f "$BACKUP_DIR/file2.txt" ]; then
    echo "[ERROR] Initial backup failed: files not found in backup directory."
    exit 1
fi
echo "[SUCCESS] Initial backup verified."

# 3. Save copy timestamps
MOD_TIME_BACKUP1_BEFORE=$(stat -c %Y "$BACKUP_DIR/file1.txt" 2>/dev/null || stat -f %m "$BACKUP_DIR/file1.txt")

# 4. Modify one file and keep the other unchanged
echo "Step 3: Modifying file1.txt in source..."
sleep 1.5
echo "modified content" > "$SRC_DIR/file1.txt"

# 5. Incremental copy simulation (copies only if modified size or time differs)
echo "Step 4: Running incremental backup simulation..."
for src_file in "$SRC_DIR"/*; do
    filename=$(basename "$src_file")
    dest_file="$BACKUP_DIR/$filename"
    
    if [ -f "$dest_file" ]; then
        src_size=$(stat -c %s "$src_file" 2>/dev/null || stat -f %z "$src_file")
        dest_size=$(stat -c %s "$dest_file" 2>/dev/null || stat -f %z "$dest_file")
        
        src_mtime=$(stat -c %Y "$src_file" 2>/dev/null || stat -f %m "$src_file")
        dest_mtime=$(stat -c %Y "$dest_file" 2>/dev/null || stat -f %m "$dest_file")
        
        # Check if identical in size and modified within a 2-second range
        time_diff=$((src_mtime - dest_mtime))
        # Absolute difference
        time_diff=${time_diff#-}
        
        if [ "$src_size" -eq "$dest_size" ] && [ "$time_diff" -lt 2 ]; then
            echo "Skipping file (unchanged): $filename"
            continue
        fi
    fi
    
    echo "Copying file (new or modified): $filename"
    cp -p "$src_file" "$dest_file"
done

# 6. Verify assertions
echo "Step 5: Verifying outcomes..."
MOD_TIME_BACKUP1_AFTER=$(stat -c %Y "$BACKUP_DIR/file1.txt" 2>/dev/null || stat -f %m "$BACKUP_DIR/file1.txt")
MOD_TIME_BACKUP2_AFTER=$(stat -c %Y "$BACKUP_DIR/file2.txt" 2>/dev/null || stat -f %m "$BACKUP_DIR/file2.txt")

if [ "$MOD_TIME_BACKUP1_BEFORE" -eq "$MOD_TIME_BACKUP1_AFTER" ]; then
    echo "[ERROR] file1.txt was NOT updated incrementally in backup."
    exit 1
fi

echo "[SUCCESS] file1.txt backup was updated."
echo "[SUCCESS] Incremental backup verification passed successfully!"

# Clean up sandbox
rm -rf "$TEST_DIR"
echo "Temporary test directory cleaned."
echo "=================================================="
