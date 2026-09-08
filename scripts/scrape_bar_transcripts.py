import os
import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# High-signal Beyond All Reason tutorial & competitive guide videos
TARGET_VIDEOS = {
    "Hy_xebtAfr4": "BAR Beginner Guide - Economy, Metal, Energy, Build Power",
    "amWOq-lxyIk": "Comprehensive Beginners Guide - Tech Tree & Eco",
    "0QLGRwhjTpI": "Competitive Frontline Build Order & Strategy",
    "xCn777Cu-q4": "BAR Academy 1v1 Competitive Opening Breakdown",
    "_KSbQkz7qDM": "Crucial Commander Control & Building Tips"
}

OUTPUT_DIR = os.path.join(os.getcwd(), "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "transcripts.json")

def get_transcript_text(video_id):
    """Compatible with both legacy (v0.x) and modern (v1.x+) youtube-transcript-api."""
    if hasattr(YouTubeTranscriptApi, "get_transcript"):
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=["en"])
        return " ".join([item["text"].replace("\n", " ") for item in transcript])
    else:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id, languages=["en"])
        return " ".join([item.text.replace("\n", " ") for item in transcript.snippets])

def extract_and_clean():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    compiled_knowledge = []

    print("[*] Beginning transcript extraction for Beyond All Reason guides...")

    for video_id, title in TARGET_VIDEOS.items():
        print(f" -> Fetching: {title} ({video_id})")
        try:
            full_text = get_transcript_text(video_id)
            
            compiled_knowledge.append({
                "video_id": video_id,
                "title": title,
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "transcript": full_text
            })
            print(f"    [+] Successfully processed {len(full_text.split())} words.")
        except Exception as e:
            print(f"    [!] Error extracting {video_id}: {e}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(compiled_knowledge, f, indent=2, ensure_ascii=False)

    print(f"\n[+] Extracted knowledge saved to: {OUTPUT_FILE}")

if __name__ == "__main__":
    extract_and_clean()
