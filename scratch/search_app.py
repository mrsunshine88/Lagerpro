with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        if "confirm(" in line:
            print(f"Line {idx+1}: {line.strip()}")
