import os
from datetime import timedelta
from transformers import pipeline

# -------------------- Load Subtitles --------------------

def load_subtitles(subtitle_file):
    with open(subtitle_file, "r", encoding="utf-8") as f:
        lines = f.readlines()

    subtitles = []
    current_subtitle = {"start": None, "end": None, "text": ""}
    
    for line in lines:
        line = line.strip()
        if "-->" in line:  # This line contains the timestamp
            times = line.split(" --> ")
            current_subtitle["start"] = times[0]
            current_subtitle["end"] = times[1]
        elif line == "":
            if current_subtitle["start"] and current_subtitle["text"]:
                subtitles.append(current_subtitle)
                current_subtitle = {"start": None, "end": None, "text": ""}
        else:
            current_subtitle["text"] += " " + line

    return subtitles


# -------------------- Sentiment Analysis --------------------

def analyze_sentiment(subtitles):
    """Performs sentiment analysis and returns timestamps for high-sentiment parts."""
    sentiment_pipeline = pipeline("sentiment-analysis")
    high_sentiment_timestamps = []

    for subtitle in subtitles:
        text = subtitle["text"]  # Fix: Use dictionary key
        start_time = subtitle["start"]
        end_time = subtitle["end"]

        result = sentiment_pipeline(text)[0]
        label = result["label"]
        confidence = result["score"]

        # If sentiment is positive/exciting, store the timestamp
        if label == "POSITIVE" and confidence > 0.8:  # Adjust threshold as needed
            high_sentiment_timestamps.append((start_time, end_time))

        print(f"Text: {text}\nSentiment: {label}, Confidence: {confidence:.4f}\n")

    return high_sentiment_timestamps

from transformers import pipeline

def analyze_excitement(subtitles):
    """Classifies subtitles as 'Exciting' or 'Boring' using sentiment + keyword analysis."""
    
    # Load a better sentiment model (engagement levels)
    sentiment_pipeline = pipeline("sentiment-analysis", model="nlptown/bert-base-multilingual-uncased-sentiment")

    exciting_timestamps = []

    # Define words associated with excitement
    exciting_keywords = {"win", "goal", "amazing", "wow", "shocking", "intense", "fight", "incredible", "score", "danger"}
    boring_keywords = {"wait", "pause", "quiet", "silence", "nothing", "static", "empty", "irrelevant", "slow"}

    for subtitle in subtitles:
        text = subtitle["text"].lower()
        start_time = subtitle["start"]
        end_time = subtitle["end"]

        # Get sentiment prediction (scale of 1 to 5)
        result = sentiment_pipeline(text)[0]
        label = result["label"]
        confidence = result["score"]

        # Convert labels (e.g., '5 stars' = high excitement)
        rating = int(label[0])  # Extract number from label

        # Check keywords
        contains_exciting_word = any(word in text for word in exciting_keywords)
        contains_boring_word = any(word in text for word in boring_keywords)

        # Determine if it's exciting
        is_exciting = (rating >= 4 and confidence > 0.6) or contains_exciting_word
        is_boring = (rating <= 2 and confidence > 0.6) or contains_boring_word

        # Save timestamp if exciting
        if is_exciting and not is_boring:
            exciting_timestamps.append((start_time, end_time))

        print(f"Text: {text}\nRating: {rating}, Confidence: {confidence:.4f}, Exciting: {is_exciting}\n")

    return exciting_timestamps



# -------------------- Save Important Timestamps --------------------

def save_timestamps(high_sentiment_timestamps, output_file="high_sentiment.txt"):
    """Saves timestamps of high-excitement moments to a file."""
    with open(output_file, "w") as f:
        for start, end in high_sentiment_timestamps:
            f.write(f"{start},{end}\n")

    print(f"\nSaved {len(high_sentiment_timestamps)} timestamps to {output_file}")

# -------------------- Run Analysis --------------------

if __name__ == "__main__":
    subtitle_file = "subtitles.srt"
    subtitles = load_subtitles(subtitle_file)

    if subtitles:
        high_sentiment_timestamps = analyze_excitement(subtitles)
        save_timestamps(high_sentiment_timestamps)
    else:
        print("No subtitles found. Please extract subtitles from the video first.")
