import json
import os

target_steps = [953, 975, 983, 1009, 1019, 1130, 1132, 1138, 1144, 1150, 1228, 1284, 1302]

for step in target_steps:
    path = f"scratch/step_{step}.json"
    if os.path.exists(path):
        size = os.path.getsize(path)
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            print(f"Step {step}: Size={size} bytes, Valid JSON=True")
            # Let's inspect tool_calls
            for tc in data.get('tool_calls', []):
                args = tc.get('args', {})
                tf = args.get('TargetFile', '')
                print(f"  Tool: {tc.get('name')}, TargetFile: {tf}")
                if 'ReplacementChunks' in args:
                    v = args['ReplacementChunks']
                    print(f"    ReplacementChunks type: {type(v)}")
                    if isinstance(v, str):
                        print(f"    ReplacementChunks length: {len(v)}")
                        # Try to parse v as json
                        try:
                            chunks = json.loads(v, strict=False)
                            print(f"      Valid Chunks JSON=True, count={len(chunks)}")
                        except Exception as e:
                            print(f"      Valid Chunks JSON=False ({e})")
                            print(f"      Value snippet: {v[:200]} ... {v[-200:]}")
        except Exception as e:
            print(f"Step {step}: Size={size} bytes, Valid JSON=False ({e})")
    else:
        print(f"Step {step}: File does not exist")
