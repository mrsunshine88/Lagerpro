def search_analytics_css():
    with open("frontend/src/features/analytics/AnalyticsTab.tsx", "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    for i, line in enumerate(lines):
        if "style=" in line or "className=" in line:
            print(f"Line {i+1}: {line.strip()}")

if __name__ == "__main__":
    search_analytics_css()
