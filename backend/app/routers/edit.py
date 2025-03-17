from fastapi import Depends, APIRouter, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
import shutil
import os
from ..utils import load_subtitles, analyze_excitement, save_timestamps, create_clips
from ..oauth2 import get_current_user
import time
import subprocess
import uuid
from ..schemas import TrimVideoRequest

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "..", "static")

@router.post("/create_segments/", status_code=201)
async def create_segments(video: UploadFile = File(...), subtitle: UploadFile = File(...), db: Session = Depends(get_db), user = Depends(get_current_user)):
    """API to receive video & subtitle file, process subtitles, create segments, and store segment names."""

    if not subtitle.filename.endswith(".srt"):
        raise HTTPException(status_code=400, detail="Only .srt subtitle files are supported.")

    # Generate unique filenames
    unique_video_filename = f"{uuid.uuid4()}_{video.filename}"
    unique_subtitle_filename = f"{uuid.uuid4()}_{subtitle.filename}"

    video_path = os.path.join(STATIC_DIR, unique_video_filename)
    subtitle_path = os.path.join(STATIC_DIR, unique_subtitle_filename)

    # Save uploaded files
    with open(video_path, "wb") as f:
        shutil.copyfileobj(video.file, f)
    with open(subtitle_path, "wb") as f:
        shutil.copyfileobj(subtitle.file, f)

    # Process subtitles
    subtitles = load_subtitles(subtitle_path)
    if not subtitles:
        raise HTTPException(status_code=400, detail="No subtitles found in file.")

    timestamps = analyze_excitement(subtitles)

    timestamps_file = os.path.join(STATIC_DIR, f"{uuid.uuid4()}_high_sentiment.txt")
    save_timestamps(timestamps, timestamps_file)

    # Start timing for segment creation
    segment_creation_start_time = time.time()

    segment_paths = create_clips(video_path, timestamps_file, STATIC_DIR)

    # End timing
    segment_creation_end_time = time.time()
    total_segment_creation_time = segment_creation_end_time - segment_creation_start_time

    # Save segment names in database
    for segment in segment_paths:
        new_filename = f"{uuid.uuid4()}_{os.path.basename(segment)}"
        new_path = os.path.join(STATIC_DIR, new_filename)
        
        # Rename the file in the static directory
        os.rename(segment, new_path)

        # Save the renamed file in the database
        new_segment = models.Segments(user_id=user.id, segment=new_filename, video=unique_video_filename)
        db.add(new_segment)

    # Store original files & processing time in EditHistory
    new_history = models.EditHistory(
        inputVideo=unique_video_filename,
        subtitle=unique_subtitle_filename,
        user_id=user.id
    )
    db.add(new_history)

    db.commit()

    segment_urls = [f"{os.path.basename(segment)}" for segment in segment_paths]

    return {
        "message": "Processing complete",
        "segment_urls": segment_urls,
        "video_url": unique_video_filename,
        "subtitle_url": unique_subtitle_filename,
        "total_segments": len(segment_paths),
        "total_time": total_segment_creation_time
    }


@router.post("/trim_video/", status_code=201)
async def trim_video_api(request: TrimVideoRequest, db: Session = Depends(get_db), user = Depends(get_current_user)):
    """API to receive list of segment names, concatenate them, and return the final video."""
    
    segment_names = request.segment_names

    if not segment_names:
        raise HTTPException(status_code=400, detail="No segments selected for concatenation.")

    # Retrieve the segments from the static folder
    segment_files = []
    print(segment_names)
    for segment_name in segment_names:
        segment_path = os.path.join(STATIC_DIR, segment_name)
        if not os.path.exists(segment_path):
            raise HTTPException(status_code=404, detail=f"Segment {segment_name} not found in static folder.")
        segment_files.append(segment_path)

    # Start time for video concatenation
    video_concat_start_time = time.time()

    # Create a temporary text file with the list of segment files for FFmpeg
    concat_list_file = os.path.join(STATIC_DIR, f"concat_list_{uuid.uuid4()}.txt")
    
    try:
        with open(concat_list_file, "w", encoding="utf-8") as f:
            for segment_file in segment_files:
                # Escape Windows paths or use forward slashes
                f.write(f"file '{segment_file.replace('\\', '/')}'\n")

        # Output path for the final concatenated video
        final_video_path = os.path.join(STATIC_DIR, f"final_output_{user.id}_{uuid.uuid4()}.mp4")
        
        ffmpeg_path = r"C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe"

        # FFmpeg command to concatenate the video segments
        command = [
            ffmpeg_path, 
            "-f", "concat", 
            "-safe", "0", 
            "-i", concat_list_file, 
            "-c", "copy", 
            "-y", final_video_path
        ]

        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"FFmpeg Error: {result.stderr}")

        # Clean up the temporary concat list file
        os.remove(concat_list_file)

        # Calculate the total time for video concatenation
        video_concat_end_time = time.time()
        total_video_concat_time = video_concat_end_time - video_concat_start_time

        # Save the final video URL in the database
        final_video_url = os.path.basename(final_video_path)

        # Fetch the last uploaded video and subtitle filenames for the user
        last_edit_history = db.query(models.EditHistory).filter(models.EditHistory.user_id == user.id).order_by(models.EditHistory.id.desc()).first()

        input_video_filename = last_edit_history.inputVideo if last_edit_history else "unknown_video.mp4"
        subtitle_filename = last_edit_history.subtitle if last_edit_history else "unknown_subtitle.srt"

        # Save the final concatenated video information
        new_history = models.EditHistory(
            inputVideo=input_video_filename,
            outputVideo=final_video_url,
            subtitle=subtitle_filename,
            time=str(total_video_concat_time),
            user_id=user.id
        )
        db.add(new_history)
        db.commit()

        # Return the URL of the final concatenated video
        return {
            "message": "Video concatenation complete",
            "final_video_url": final_video_url,
            "total_time": total_video_concat_time
        }

    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Error occurred while concatenating videos: {e}")
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(ex)}")
    finally:
        # Ensure temp file is deleted even if an error occurs
        if os.path.exists(concat_list_file):
            os.remove(concat_list_file)
