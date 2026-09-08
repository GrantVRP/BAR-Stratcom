import json

with open("data/transcripts.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for item in data:
    text = item["transcript"]
    print(f"=== {item['title']} ===")
    for keyword in ["60 energy", "ratio", "wind", "reclaim", "solar", "caster", "academy", "opening", "commander"]:
        pos = 0
        found = 0
        while True:
            idx = text.lower().find(keyword, pos)
            if idx == -1 or found >= 2:
                break
            start = max(0, idx - 100)
            end = min(len(text), idx + 250)
            print(f"[{keyword.upper()}] ...{text[start:end]}...\n")
            pos = idx + len(keyword) + 100
            found += 1
