import re
import subprocess
import os

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
    concat_video = f"[{' '.join([f'v{idx}' for idx in range(len(timestamps))])}]concat=n={len(timestamps)}:v=1:a=0[vout]"
    concat_audio = f"[{' '.join([f'a{idx}' for idx in range(len(timestamps))])}]concat=n={len(timestamps)}:v=0:a=1[aout]"

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

# Usage
input_video = "input_video.mp4"  # Path to the input video
timestamps_file = "high_sentiment.txt"  # Path to the file containing timestamps
output_folder = "output_segments"  # Folder to save the output segments

# Call the trim_video function
trim_video(input_video, timestamps_file, output_folder)
