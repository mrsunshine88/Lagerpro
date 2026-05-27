with open("scratch/step_1130.json", "r", encoding="utf-8") as f:
    import json
    data = json.load(f)
    print(json.dumps(data, indent=2))
