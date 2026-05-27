import json

log_path = r"C:\Users\perss\.gemini\antigravity-ide\brain\4bc8f089-b5f5-4375-9da7-fb291e217c27\.system_generated\logs\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            tool_calls = data.get('tool_calls', [])
            for tc in tool_calls:
                args = tc.get('args', {})
                tf = args.get('TargetFile', '')
                if tf and 'App.tsx' in tf:
                    print("Found step index:", data.get('step_index'))
                    print("Tool:", tc.get('name'))
                    print("Description:", args.get('Description'))
                    print("StartLine:", args.get('StartLine'), "EndLine:", args.get('EndLine'))
                    print("ReplacementContent Length:", len(args.get('ReplacementContent', '')))
                    chunks = args.get('ReplacementChunks', [])
                    if chunks:
                        print("Chunks count:", len(chunks))
                    print("="*40)
        except Exception as e:
            pass
