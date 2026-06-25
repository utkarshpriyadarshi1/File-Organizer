import re
import json
import os
import sys
import sqlite3
import datetime

def bump_version(current_version, bump_type):
    parts = list(map(int, current_version.split('.')))
    if len(parts) != 3:
        raise ValueError(f"Invalid semver version: {current_version}")
    
    if bump_type == 'major':
        parts[0] += 1
        parts[1] = 0
        parts[2] = 0
    elif bump_type == 'minor':
        parts[1] += 1
        parts[2] = 0
    else: # patch
        parts[2] += 1
        
    return ".".join(map(str, parts))

def main():
    bump_type = 'patch'
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if arg in ['major', 'minor', 'patch']:
            bump_type = arg

    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(script_dir)
    
    config_path = os.path.join(root_dir, 'app.config.json')
    pom_path = os.path.join(root_dir, 'server', 'pom.xml')
    pkg_path = os.path.join(root_dir, 'ui', 'package.json')
    
    if not os.path.exists(config_path):
        print(f"❌ app.config.json not found at {config_path}")
        sys.exit(1)
        
    # 1. Read app.config.json
    with open(config_path, 'r', encoding='utf-8') as f:
        config_data = json.load(f)
        
    current_version = config_data.get('version', '0.0.3')
    new_version = bump_version(current_version, bump_type)
    
    # Update app.config.json version
    config_data['version'] = new_version
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config_data, f, indent=2)
    print(f"[VERSION] Bumped version in app.config.json: {current_version} -> {new_version}")

    # Copy config to ui/src and server/src/main/resources
    fe_config_dir = os.path.join(root_dir, 'ui', 'src')
    be_config_dir = os.path.join(root_dir, 'server', 'src', 'main', 'resources')
    
    os.makedirs(fe_config_dir, exist_ok=True)
    os.makedirs(be_config_dir, exist_ok=True)
    
    with open(os.path.join(fe_config_dir, 'app.config.json'), 'w', encoding='utf-8') as f:
        json.dump(config_data, f, indent=2)
    print(f"Copied app.config.json to ui/src/")
    
    with open(os.path.join(be_config_dir, 'app.config.json'), 'w', encoding='utf-8') as f:
        json.dump(config_data, f, indent=2)
    print(f"Copied app.config.json to server resources")

    # 2. Update frontend package.json version
    if os.path.exists(pkg_path):
        with open(pkg_path, 'r', encoding='utf-8') as f:
            pkg_data = json.load(f)
        old_pkg_ver = pkg_data.get('version', '')
        pkg_data['version'] = new_version
        with open(pkg_path, 'w', encoding='utf-8') as f:
            json.dump(pkg_data, f, indent=2)
        print(f"Updated package.json version from {old_pkg_ver} to {new_version}")

    # 3. Update backend pom.xml version
    if os.path.exists(pom_path):
        with open(pom_path, 'r', encoding='utf-8') as f:
            pom_content = f.read()
            
        version_pattern = re.compile(r"</parent>.*?<version>([^<]+)</version>", re.DOTALL)
        match = version_pattern.search(pom_content)
        if match:
            old_pom_version = match.group(1)
            # pom version can keep SNAPSHOT if it had it
            new_pom_version = new_version
            if old_pom_version.endswith("-SNAPSHOT"):
                new_pom_version += "-SNAPSHOT"
                
            parent_end_idx = pom_content.find("</parent>")
            project_version_idx = pom_content.find(f"<version>{old_pom_version}</version>", parent_end_idx)
            
            if project_version_idx != -1:
                before = pom_content[:project_version_idx]
                after = pom_content[project_version_idx:]
                after_replaced = after.replace(f"<version>{old_pom_version}</version>", f"<version>{new_pom_version}</version>", 1)
                pom_content = before + after_replaced
                with open(pom_path, 'w', encoding='utf-8') as f:
                    f.write(pom_content)
                print(f"Updated pom.xml version from {old_pom_version} to {new_pom_version}")

    # 4. Register version in existing SQLite databases
    db_paths = [
        os.path.join(root_dir, "server", "file-organizer.db"),
        os.path.join(root_dir, "file-organizer.db")
    ]
    for db_path in db_paths:
        if os.path.exists(db_path):
            try:
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS registered_versions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        version TEXT UNIQUE NOT NULL,
                        registered_at TEXT NOT NULL
                    )
                """)
                now_str = datetime.datetime.now().isoformat()
                cursor.execute(
                    "INSERT OR IGNORE INTO registered_versions (version, registered_at) VALUES (?, ?)",
                    (new_version, now_str)
                )
                conn.commit()
                conn.close()
                print(f"Registered version {new_version} in SQLite database: {db_path}")
            except Exception as e:
                print(f"Failed to register version in database {db_path}: {e}")

if __name__ == '__main__':
    main()
