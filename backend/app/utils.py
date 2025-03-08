from passlib.context import CryptContext
import random
import string
import shutil
from transformers import pipeline
import re
import subprocess
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password) :
    return pwd_context.verify(plain_password, hashed_password)

# get the photo uploaded by the user and download it to the server
def save_photo(photo) :
    with open(f"photos/{photo.filename}", "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)
    return f"photos/{photo.filename}"

# generate random string of length 10
def random_string() :
    return ''.join(random.choices(string.ascii_letters + string.digits, k=32))

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

def save_timestamps(high_sentiment_timestamps, output_file="high_sentiment.txt"):
    """Saves timestamps of high-excitement moments to a file."""
    with open(output_file, "w") as f:
        for start, end in high_sentiment_timestamps:
            f.write(f"{start},{end}\n")

    print(f"\nSaved {len(high_sentiment_timestamps)} timestamps to {output_file}")
    
def convert_to_seconds(timestamp):
    """Converts timestamp in hh:mm:ss,SSS format to seconds."""
    time_pattern = r"(\d{2}):(\d{2}):(\d{2}),(\d{3})"
    match = re.match(time_pattern, timestamp)
    if match:
        hours, minutes, seconds, milliseconds = match.groups()
        total_seconds = int(hours) * 3600 + int(minutes) * 60 + int(seconds) + int(milliseconds) / 1000
        return total_seconds
    else:
        raise ValueError(f"Invalid timestamp format: {timestamp}")
    
def trim_video(input_file, timestamps_file, output_folder):
    # Ensure output folder exists
    os.makedirs(output_folder, exist_ok=True)

    # Read timestamps from the file
    with open(timestamps_file, 'r') as f:
        timestamps = []
        for line in f:
            parts = line.strip().split(',')
            if len(parts) < 4:
                print(f"Skipping invalid line: {line.strip()}")
                continue  # Skip invalid lines
            
            start = ','.join(parts[:2])  # Join first two parts for start time
            end = ','.join(parts[2:])    # Join last two parts for end time
            
            start_seconds = convert_to_seconds(start)
            end_seconds = convert_to_seconds(end)
            timestamps.append((start_seconds, end_seconds))

    print("Timestamps:", timestamps)
    
    # Create a list to hold the paths of the output segments
    video_filters = []
    audio_filters = []
    
    # Now, iterate through and trim video based on the timestamps
    for idx, (start, end) in enumerate(timestamps):
        print(f"Processing segment {idx+1}: {start}s to {end}s")
        
        # Generate output file name for the segment
        output_file = os.path.join(output_folder, f"segment_{idx+1}.mp4")
        
        # FFmpeg filter for trimming video and audio
        video_filters.append(f"[0:v]trim=start={start}:end={end},setpts=PTS-STARTPTS[v{idx}]")
        audio_filters.append(f"[0:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS[a{idx}]")

    # Concatenate video and audio filters
    concat_video = f"{''.join([f'[v{idx}]' for idx in range(len(timestamps))])}concat=n={len(timestamps)}:v=1:a=0[vout]"
    concat_audio = f"{''.join([f'[a{idx}]' for idx in range(len(timestamps))])}concat=n={len(timestamps)}:v=0:a=1[aout]"


    # Filter complex string
    filter_complex = ";".join(video_filters + audio_filters + [concat_video, concat_audio, "[vout][aout]concat=n=1:v=1:a=1[outv][outa]"])

    # Final output video path
    final_output = os.path.join(output_folder, "final_output.mp4")
    
    ffmpeg_path = r"C:\ProgramData\chocolatey\bin\ffmpeg.exe"

    # FFmpeg command to trim and concatenate the segments
    command = [
        ffmpeg_path,
        '-i', input_file,  # Input video file
        '-filter_complex', filter_complex,  # Complex filter for trimming and concatenation
        '-map', '[outv]',  # Map the final video stream
        '-map', '[outa]',  # Map the final audio stream
        '-c:v', 'libx264',  # Video codec
        '-c:a', 'aac',  # Audio codec
        '-y',  # Overwrite output file if exists
        final_output  # Final output file
    ]
    
    # Run the FFmpeg command
    try:
        subprocess.run(command, check=True)
        print(f"Successfully created the final concatenated video: {final_output}")
    except subprocess.CalledProcessError as e:
        print(f"Error occurred while processing the video: {e}")