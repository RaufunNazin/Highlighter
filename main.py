import time
from datetime import datetime, timedelta
from transformers import pipeline

# -------------------- Load Subtitles --------------------

def load_subtitles(subtitle_file):
    print("Loading subtitles...")
    start_time = time.time()

    with open(subtitle_file, "r", encoding="utf-8") as f:
        lines = f.readlines()

    subtitles = []
    current_subtitle = {"start": None, "end": None, "text": ""}

    for line in lines:
        line = line.strip()
        if "-->" in line:  # Timestamp line
            times = line.split(" --> ")
            current_subtitle["start"] = times[0]
            current_subtitle["end"] = times[1]
        elif line == "":
            if current_subtitle["start"] and current_subtitle["text"]:
                subtitles.append(current_subtitle)
                current_subtitle = {"start": None, "end": None, "text": ""}
        else:
            current_subtitle["text"] += " " + line

    print(f"Subtitles loaded. Total subtitles: {len(subtitles)} (Time: {time.time() - start_time:.2f} sec)")
    return subtitles


# -------------------- Keyword Categories --------------------

EXCITING_KEYWORDS = {
        "goal", "scored", "winning", "champion", "shoot", "shot", "attack", "dribble", "tackle",  
        "strike", "header", "corner", "free-kick", "penalty", "save", "offside", "counterattack",  
        "equalizer", "hat-trick", "celebration", "cheer", "roar", "thrilling", "sensational",  
        "brilliant", "amazing", "unbelievable", "stunning", "spectacular", "breathtaking",  
        "incredible", "comeback", "last-minute", "injury-time", "extra-time", "pressure",  
        "intense", "electric", "frenzy", "fast-paced", "end-to-end", "breakaway", "unstoppable",  
        "masterclass", "legendary", "heroic", "explosive", "wild", "epic", "drama", "magnificent",  
        "blockbuster", "thunderous", "volley", "half-volley", "bicycle-kick", "chip", "curling",  
        "dazzling", "finesse", "powerful", "blistering", "world-class", "red-card", "yellow-card",  
        "foul", "controversial", "VAR", "heart-stopping", "nail-biting", "edge-of-seat", "relentless",  
        "dominance", "flawless", "decisive", "magic", "triumph", "rivalry", "undefeated",  
        "gutsy", "miraculous", "roaring", "breakthrough", "highlight", "unstoppable", "unstoppable-run",  
        "backheel", "nutmeg", "long-range", "wonder-goal", "screamer", "rocket", "unstoppable-shot",  
        "top-corner", "worldie", "brilliant-save", "last-gasp", "title-decider", "underdog-victory",  
        "record-breaking", "unstoppable-form", "unstoppable-strike", "moment-of-magic"
    }

HIGH_IMPACT_KEYWORDS = {
    "goal", "scored", "penalty", "red card", "yellow card", "free kick", 
    "corner", "VAR", "equalizer", "last-minute", "extra-time", "injury-time"
}

BORING_KEYWORDS = {
        "goalless", "draw", "dull", "slow", "boring", "lackluster", "passive", "uneventful", "mundane",  
        "predictable", "stagnant", "lifeless", "tedious", "pointless", "disappointing", "underwhelming",  
        "missed", "off-target", "sideways", "backpass", "defensive", "cautious", "meaningless",  
        "scoreless", "static", "half-hearted", "weak", "sloppy", "mistake", "error", "misplaced",  
        "poor", "underperforming", "time-wasting", "delay", "long-ball", "scrappy", "stretched",  
        "slow-tempo", "exhausted", "foul-filled", "stoppage", "injury-break", "out-of-form", "routine",  
        "unambitious", "tired", "wasteful", "long-spell", "no-attacking-intent", "midfield-battle",  
        "low-energy", "inconsistent", "pass-heavy", "aimless", "non-threatening", "predictable-passing",  
        "offside-trap", "possession-based", "no-clear-chances", "low-intensity", "one-sided",  
        "overhit", "underhit", "overcautious", "deep-block", "meaningless-possession", "cagey",  
        "conservative", "out-of-ideas", "low-block", "park-the-bus", "counterproductive",  
        "negative-play", "uninspired", "dry-spell", "few-opportunities", "no-shots-on-target",  
        "defensive-minded", "wasted-opportunities", "shutout", "midfield-clog", "passive-pressing",  
        "drained", "time-wasting-tactics", "holding-shape", "recycled-passing", "safe-play",  
        "lacking-creativity", "few-highlights", "excessive-passing", "non-clinical", "careless",  
        "missed-sitter", "out-of-sync", "poor-control", "miscommunication", "slow-buildup",  
        "low-risk", "lack-of-movement", "rigid", "lacking-intensity", "possession-without-purpose"
    };


# -------------------- Sentiment & Keyword Analysis --------------------


def analyze_excitement(subtitles):
    """Identifies exciting moments using sentiment & keyword analysis."""
    
    print("\nInitializing sentiment analysis model...")
    model_load_time = time.time()
    sentiment_pipeline = pipeline("sentiment-analysis", model="nlptown/bert-base-multilingual-uncased-sentiment")
    print(f"Model loaded successfully. (Time: {time.time() - model_load_time:.2f} sec)")

    exciting_timestamps = []
    print("\nAnalyzing subtitles for excitement...")
    analysis_start_time = time.time()

    for i, subtitle in enumerate(subtitles):
        text = subtitle["text"].lower()
        start_time = subtitle["start"]
        end_time = subtitle["end"]

        # Check if text contains exciting or high-impact keywords
        contains_exciting_word = any(word in text for word in EXCITING_KEYWORDS)
        contains_high_impact_word = any(word in text for word in HIGH_IMPACT_KEYWORDS)
        contains_boring_word = any(word in text for word in BORING_KEYWORDS)

        # Sentiment analysis
        result = sentiment_pipeline(text)[0]
        rating = int(result["label"][0])  # Extract numeric rating (1-5 scale)
        confidence = result["score"]

        # Determine if this subtitle is exciting
        is_exciting = (rating >= 4 and confidence > 0.6) or contains_exciting_word
        is_high_impact = contains_high_impact_word
        is_boring = contains_boring_word

        # Adjust timestamps if exciting or high impact
        if is_exciting or is_high_impact:
            adjusted_start, adjusted_end = adjust_timestamps(start_time, end_time, is_high_impact)
            exciting_timestamps.append((adjusted_start, adjusted_end))
            
        print(f"Text: {text}\nRating: {rating}, Confidence: {confidence:.4f}, Exciting: {is_exciting}, High Impact: {is_high_impact}, Boring: {is_boring}\n")

        # Log progress every 10 subtitles
        if i % 10 == 0:
            print(f"Processed {i+1}/{len(subtitles)} subtitles...")

    print(f"Excitement analysis completed. (Time: {time.time() - analysis_start_time:.2f} sec)")
    return merge_overlapping_timestamps(exciting_timestamps)


# -------------------- Adjust Timestamps for Key Events --------------------

def adjust_timestamps(start, end, is_high_impact):
    """Extends timestamps for crucial moments."""
    start_dt = datetime.strptime(start, "%H:%M:%S,%f")
    end_dt = datetime.strptime(end, "%H:%M:%S,%f")

    if is_high_impact:
        start_dt -= timedelta(seconds=5)  # Extend earlier for buildup
        end_dt += timedelta(seconds=5)  # Extend later for aftermath
        print(f"High Impact: {start_dt.strftime('%H:%M:%S,%f')[:-3]} - {end_dt.strftime('%H:%M:%S,%f')[:-3]}")
    else:
        start_dt -= timedelta(seconds=2)  # Normal excitement: slight extension
        end_dt += timedelta(seconds=2)

    return start_dt.strftime("%H:%M:%S,%f")[:-3], end_dt.strftime("%H:%M:%S,%f")[:-3]


# -------------------- Merge Overlapping Timestamps --------------------

def merge_overlapping_timestamps(timestamps):
    """Merges overlapping timestamps into continuous highlights."""
    if not timestamps:
        return []

    merged_timestamps = []
    timestamps.sort()  # Ensure chronological order

    current_start, current_end = timestamps[0]

    for next_start, next_end in timestamps[1:]:
        current_end_dt = datetime.strptime(current_end, "%H:%M:%S,%f")
        next_start_dt = datetime.strptime(next_start, "%H:%M:%S,%f")
        next_end_dt = datetime.strptime(next_end, "%H:%M:%S,%f")

        # If timestamps overlap or are within 3 seconds, merge them
        if next_start_dt <= current_end_dt + timedelta(seconds=3):
            current_end = max(current_end, next_end)  # Extend current segment
            print(f"Merged: {current_start} - {current_end}")
        else:
            merged_timestamps.append((current_start, current_end))
            current_start, current_end = next_start, next_end

    merged_timestamps.append((current_start, current_end))
    return merged_timestamps


# -------------------- Save Important Timestamps --------------------

def save_timestamps(timestamps, output_file="high_sentiment.txt"):
    """Saves timestamps of high-excitement moments to a file."""
    with open(output_file, "w") as f:
        for start, end in timestamps:
            f.write(f"{start},{end}\n")

    print(f"\nSaved {len(timestamps)} timestamps to {output_file}")


# -------------------- Run Analysis --------------------

if __name__ == "__main__":
    overall_start_time = time.time()
    subtitle_file = "subtitles.srt"
    
    subtitles = load_subtitles(subtitle_file)
    if subtitles:
        high_sentiment_timestamps = analyze_excitement(subtitles)
        save_timestamps(high_sentiment_timestamps)
    else:
        print("No subtitles found. Please extract subtitles from the video first.")

    # Display total execution time
    print(f"\nTotal Execution Time: {time.time() - overall_start_time:.2f} sec")
