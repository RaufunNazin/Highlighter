import os
from app.utils import trim_video, create_clips

# Usage configuration
input_video = "input_video.mp4"
timestamps_file = "high_sentiment.txt"
output_folder = "static"

if __name__ == "__main__":
    print(f"Processing video: {input_video}")
    
    # Ensure static directory exists for output
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
        
    # Example usage: create individual clips
    segment_paths = create_clips(input_video, timestamps_file, output_folder)  
    print(f"Segment files created in {output_folder}: {segment_paths}")
    
    # Optional: create a single concatenated video
    # trim_video(input_video, timestamps_file, output_folder)
