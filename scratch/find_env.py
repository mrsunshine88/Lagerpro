import os

found_files = []
for root, dirs, files in os.walk("."):
    # skip node_modules
    if "node_modules" in root or ".git" in root or "dist" in root:
        continue
    for f in files:
        if f.endswith(".env") or f == ".env":
            found_files.append(os.path.join(root, f))

print("Found env files:", found_files)
for path in found_files:
    print(f"\n--- Contents of {path} ---")
    try:
        with open(path, "r", encoding="utf-8") as f:
            print(f.read())
    except Exception as e:
        print("Error reading:", e)
