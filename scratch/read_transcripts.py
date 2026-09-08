import json

with open("data/transcripts.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for item in data:
    print(f"ID: {item['video_id']}")
    print(f"Title: {item['title']}")
    print(f"Chars: {len(item['transcript'])}")
    print(f"Sample: {item['transcript'][:300]}...")
    print("-" * 50)
