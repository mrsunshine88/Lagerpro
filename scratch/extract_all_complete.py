import json
import os

target_steps = [975, 983, 1019, 1130, 1132, 1138, 1144, 1150, 1302]

for step in target_steps:
    path = f"scratch/step_{step}.json"
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        for tc in data.get('tool_calls', []):
            args = tc.get('args', {})
            content = args.get('ReplacementContent', '')
            target = args.get('TargetContent', '')
            out_path = f"scratch/extracted_step_{step}.txt"
            with open(out_path, "w", encoding="utf-8") as out_f:
                out_f.write("=== TARGET CONTENT ===\n")
                out_f.write(target)
                out_f.write("\n\n=== REPLACEMENT CONTENT ===\n")
                out_f.write(content)
                out_f.write("\n")
            print(f"Extracted step {step} to {out_path}")
