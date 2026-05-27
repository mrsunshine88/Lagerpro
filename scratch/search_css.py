def view_inventory_mobile_fix():
    with open("frontend/src/index.css", "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    for i in range(2050, min(2090, len(lines))):
        print(f"Line {i+1}: {lines[i]}", end="")

if __name__ == "__main__":
    view_inventory_mobile_fix()
