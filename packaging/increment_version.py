import re
import json
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
pom_path = os.path.join(script_dir, "..", "backend", "pom.xml")
pkg_path = os.path.join(script_dir, "..", "frontend", "package.json")
ver_json_path = os.path.join(script_dir, "..", "frontend", "src", "version.json")

# 1. Read and parse pom.xml version
with open(pom_path, "r", encoding="utf-8") as f:
    pom_content = f.read()

# Pattern to find project version tag after parent tag is closed
version_pattern = re.compile(r"</parent>.*?<version>([^<]+)</version>", re.DOTALL)
match = version_pattern.search(pom_content)

if match:
    old_version = match.group(1)
    print(f"Current Maven Version: {old_version}")
    
    # Parse version e.g. 0.0.1-SNAPSHOT or 0.0.1
    parts = old_version.split("-")
    ver_nums = parts[0].split(".")
    
    # Increment patch version
    patch = int(ver_nums[-1])
    ver_nums[-1] = str(patch + 1)
    new_ver_nums_str = ".".join(ver_nums)
    
    new_version = new_ver_nums_str
    if len(parts) > 1:
        new_version += "-" + "-".join(parts[1:])
        
    print(f"New Incremented Version: {new_version}")
    
    # Replace in pom.xml (replace only the project version, not parent version)
    parent_end_idx = pom_content.find("</parent>")
    project_version_idx = pom_content.find(f"<version>{old_version}</version>", parent_end_idx)
    
    if project_version_idx != -1:
        before = pom_content[:project_version_idx]
        after = pom_content[project_version_idx:]
        after_replaced = after.replace(f"<version>{old_version}</version>", f"<version>{new_version}</version>", 1)
        pom_content = before + after_replaced
        
        with open(pom_path, "w", encoding="utf-8") as f:
            f.write(pom_content)
        print("Updated backend pom.xml successfully.")
    else:
        print("Could not find the project version string to replace.")
        
    # 2. Write version.json for the frontend
    version_data = {
        "version": new_version
    }
    os.makedirs(os.path.dirname(ver_json_path), exist_ok=True)
    with open(ver_json_path, "w", encoding="utf-8") as f:
        json.dump(version_data, f, indent=2)
    print(f"Wrote version.json: {ver_json_path}")
    
    # 3. Update frontend package.json version (strip SNAPSHOT)
    clean_ver = new_ver_nums_str
    if os.path.exists(pkg_path):
        with open(pkg_path, "r", encoding="utf-8") as f:
            pkg_data = json.load(f)
        
        old_pkg_ver = pkg_data.get("version", "")
        pkg_data["version"] = clean_ver
        
        with open(pkg_path, "w", encoding="utf-8") as f:
            json.dump(pkg_data, f, indent=2)
        print(f"Updated package.json version from {old_pkg_ver} to {clean_ver}")
else:
    print("Could not locate project version tag in pom.xml")
