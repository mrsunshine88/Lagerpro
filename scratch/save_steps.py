import json

log_path = r"C:\Users\perss\.gemini\antigravity-ide\brain\4bc8f089-b5f5-4375-9da7-fb291e217c27\.system_generated\logs\transcript.jsonl"

target_steps = [953, 975, 983, 1009, 1019, 1130, 1132, 1138, 1144, 1150, 1228, 1284, 1302]

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            step = data.get('step_index')
            if step in target_steps:
                out_path = f"scratch/step_{step}.json"
                with open(out_path, "w", encoding="utf-8") as out_f:
                    json.dump(data, out_f, indent=2)
                print(f"Saved step {step} to {out_path}")
        except Exception as e:
            pass
