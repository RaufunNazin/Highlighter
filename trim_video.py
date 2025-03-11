import re
import subprocess
import os
import time

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
    start_time = time.time()
    print("Starting video processing...")
    
    # Ensure output folder exists
    os.makedirs(output_folder, exist_ok=True)

    # Read timestamps from the file
    timestamps = []
    with open(timestamps_file, 'r') as f:
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

    print(f"Parsed timestamps: {timestamps}")
    
    video_filters = []
    audio_filters = []
    
    for idx, (start, end) in enumerate(timestamps):
        print(f"Processing segment {idx+1}: {start}s to {end}s")
        video_filters.append(f"[0:v]trim=start={start}:end={end},setpts=PTS-STARTPTS[v{idx}]")
        audio_filters.append(f"[0:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS[a{idx}]")

    concat_video = f"{''.join([f'[v{idx}]' for idx in range(len(timestamps))])}concat=n={len(timestamps)}:v=1:a=0[vout]"
    concat_audio = f"{''.join([f'[a{idx}]' for idx in range(len(timestamps))])}concat=n={len(timestamps)}:v=0:a=1[aout]"
    
    filter_complex = ";".join(video_filters + audio_filters + [concat_video, concat_audio, "[vout][aout]concat=n=1:v=1:a=1[outv][outa]"])
    
    final_output = os.path.join(output_folder, "final_output.mp4")
    
    ffmpeg_path = r"C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe"
    
    command = [
        ffmpeg_path,
        '-i', input_file,
        '-filter_complex', filter_complex,
        '-map', '[outv]',
        '-map', '[outa]',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-y',
        final_output
    ]
    
    try:
        print("Running FFmpeg command...")
        process_start_time = time.time()
        subprocess.run(command, check=True)
        process_end_time = time.time()
        print(f"Successfully created the final concatenated video: {final_output}")
        print(f"FFmpeg execution time: {process_end_time - process_start_time:.2f} seconds")
    except subprocess.CalledProcessError as e:
        print(f"Error occurred while processing the video: {e}")
    
    end_time = time.time()
    print(f"Total processing time: {end_time - start_time:.2f} seconds")

# Usage
input_video = "input_video.mp4"
timestamps_file = "high_sentiment.txt"
output_folder = "output_segments"

trim_video(input_video, timestamps_file, output_folder)
