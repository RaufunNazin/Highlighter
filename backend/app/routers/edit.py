from fastapi import Depends, APIRouter, HTTPException, File, UploadFile, Form
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
import shutil
import os
from pydantic import BaseModel
from ..utils import load_subtitles, analyze_excitement, save_timestamps, trim_video, create_clips
from ..oauth2 import check_authorization, get_current_user
import time
import subprocess
import uuid

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")

# function to generate segment name for a user
def generate_segment_name(user_id, segment):
    return f"{user_id}_{segment}"

def generate_video_name(user_id, video):
    return f"{user_id}_{video}"

class EditResponse(BaseModel):
    id: int
    inputVideo: str
    outputVideo: str
    subtitle: str
    time: str
    user_id: int
    
def save_file(file, file_path):
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
# crud for user segment
# save user's segment to the database
@router.post("/segments", tags=['edit'], status_code=201)
def save_segment(segment: str = Form(...), user_id: int = Form(...), db: Session = Depends(get_db)):
    new_segment = models.Segments(user_id=user_id, segment=segment)
    db.add(new_segment)
    db.commit()
    db.refresh(new_segment)
    return new_segment

# get user's segment by user id from the database
@router.get("/segments/{user_id}", tags=['edit'], status_code=200)
def get_segment(user_id: int, db: Session = Depends(get_db)):
    segment = db.query(models.Segments).filter(models.Segments.user_id == user_id).all()
    return segment

# get user's segment by segment id from the database
@router.get("/segments/{segment_id}", tags=['edit'], status_code=200)
def get_segment(segment_id: int, db: Session = Depends(get_db)):
    segment = db.query(models.Segments).filter(models.Segments.id == segment_id).first()
    return segment

# update user's segment by segment id from the database
@router.put("/segments/{segment_id}", tags=['edit'], status_code=200)
def update_segment(segment_id: int, segment: str = Form(...), user_id: int = Form(...), db: Session = Depends(get_db), user = Depends(get_current_user)):
    check_authorization(user)
    segment = db.query(models.Segments).filter(models.Segments.id == segment_id).first()
    segment.segment = segment
    segment.user_id = user_id
    db.commit()
    db.refresh(segment)
    return segment

# delete user's segment by segment id from the database
@router.delete("/segments/{segment_id}", tags=['edit'], status_code=204)
def delete_segment(segment_id: int, db: Session = Depends(get_db), user = Depends(get_current_user)):
    check_authorization(user)
    segment = db.query(models.Segments).filter(models.Segments.id == segment_id).first()
    db.delete(segment)
    db.commit()
    return JSONResponse(status_code=204, content="deleted")
        
# save user's edit history to the database
@router.post("/history", tags=['edit'], status_code=201)
def save_history(inputVideo: str = Form(...), outputVideo: str = Form(...), subtitle: str = Form(...), time: str = Form(...), user_id: int = Form(...), db: Session = Depends(get_db)):
    new_history = models.EditHistory(inputVideo=inputVideo, outputVideo=outputVideo, subtitle=subtitle, time=time, user_id=user_id)
    db.add(new_history)
    db.commit()
    db.refresh(new_history)
    return new_history

# get user's edit history by user id from the database
@router.get("/history/{user_id}", tags=['edit'], status_code=200)
def get_history_by_user(user_id: int, db: Session = Depends(get_db)):
    history = db.query(models.EditHistory).filter(models.EditHistory.user_id == user_id).all()
    return history

# get user's edit history by history id from the database
@router.get("/history/{history_id}", tags=['edit'], status_code=200)
def get_history_by_history(history_id: int, db: Session = Depends(get_db)):
    history = db.query(models.EditHistory).filter(models.EditHistory.id == history_id).first()
    return history

# update user's edit history by history id from the database
@router.put("/history/{history_id}", tags=['edit'], status_code=200)
def update_history(history_id: int, inputVideo: str = Form(...), outputVideo: str = Form(...), subtitle: str = Form(...), time: str = Form(...), user_id: int = Form(...), db: Session = Depends(get_db), user = Depends(get_current_user)):
    check_authorization(user)
    history = db.query(models.EditHistory).filter(models.EditHistory.id == history_id).first()
    history.inputVideo = inputVideo
    history.outputVideo = outputVideo
    history.subtitle = subtitle
    history.time = time
    history.user_id = user_id
    db.commit()
    db.refresh(history)
    return history

# delete user's edit history by history id from the database
@router.delete("/history/{history_id}", tags=['edit'], status_code=204)
def delete_history(history_id: int, db: Session = Depends(get_db), user = Depends(get_current_user)):
    check_authorization(user)
    history = db.query(models.EditHistory).filter(models.EditHistory.id == history_id).first()
    db.delete(history)
    db.commit()
    return JSONResponse(status_code=204, content="deleted")

# # upload video file
# @router.post("/upload", tags=['edit'], status_code=201)
# def upload_video(file: UploadFile = File(...)):
#     file_path = os.path.join("static", file.filename)
#     save_file(file, file_path)
#     return {"filename": file.filename}

@router.post("/create_segments/", status_code=201)
async def create_segments(video: UploadFile = File(...), subtitle: UploadFile = File(...), db: Session = Depends(get_db), user = Depends(get_current_user)):
    """API to receive video & subtitle file, process subtitles, create segments, and store segment names."""

    # Ensure subtitle file is .srt
    if not subtitle.filename.endswith(".srt"):
        raise HTTPException(status_code=400, detail="Only .srt subtitle files are supported.")

    # Generate unique filename using UUID
    unique_video_filename = f"{uuid.uuid4()}_{video.filename}"
    unique_subtitle_filename = f"{uuid.uuid4()}_{subtitle.filename}"

    # Save uploaded files
    video_path = os.path.join(STATIC_DIR, unique_video_filename)
    subtitle_path = os.path.join(STATIC_DIR, unique_subtitle_filename)

    with open(video_path, "wb") as f:
        shutil.copyfileobj(video.file, f)
    with open(subtitle_path, "wb") as f:
        shutil.copyfileobj(subtitle.file, f)

    # Process subtitles
    subtitles = load_subtitles(subtitle_path)
    if not subtitles:
        raise HTTPException(status_code=400, detail="No subtitles found in file.")

    timestamps = analyze_excitement(subtitles)

    # Save timestamps in static folder
    timestamps_file = os.path.join(STATIC_DIR, "high_sentiment.txt")
    save_timestamps(timestamps, timestamps_file)
    
    # Start time for segment creation
    segment_creation_start_time = time.time()

    # Generate clips using timestamps
    segment_paths = create_clips(video_path, timestamps_file, STATIC_DIR)
    
    # Calculate the total time for segment creation
    segment_creation_end_time = time.time()
    total_segment_creation_time = segment_creation_end_time - segment_creation_start_time
    
    # Save segment names in database
    for segment in segment_paths:
        segment_name = f"{uuid.uuid4()}_{os.path.basename(segment)}"  # Add UUID to segment name
        new_segment = models.Segments(user_id=user.id, segment=segment_name)
        db.add(new_segment)

    db.commit()  # Commit changes to the database

    # Return segment URLs
    segment_urls = [f"/download/{os.path.basename(segment)}" for segment in segment_paths]
    
    return {
        "message": "Processing complete", 
        "segment_urls": segment_urls,
        "total_segments": len(segment_paths),
        "total_time": total_segment_creation_time
    }

@router.post("/trim_video/", status_code=201)
async def trim_video_api(segment_names: list, db: Session = Depends(get_db), user = Depends(get_current_user)):
    """API to receive list of segment names, concatenate them, and return the final video."""

    # Validate that the segment names are provided
    if not segment_names:
        raise HTTPException(status_code=400, detail="No segments selected for concatenation.")

    # Retrieve the segments from the static folder
    segment_files = []
    for segment_name in segment_names:
        segment_path = os.path.join(STATIC_DIR, segment_name)
        if not os.path.exists(segment_path):
            raise HTTPException(status_code=404, detail=f"Segment {segment_name} not found in static folder.")
        segment_files.append(segment_path)

    # Start time for video concatenation
    video_concat_start_time = time.time()

    # Create a temporary text file with the list of segment files for FFmpeg
    concat_list_file = os.path.join(STATIC_DIR, "concat_list.txt")
    with open(concat_list_file, "w") as f:
        for segment_file in segment_files:
            f.write(f"file '{segment_file}'\n")

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

    try:
        subprocess.run(command, check=True)
        # Clean up the temporary concat list file
        os.remove(concat_list_file)

        # Calculate the total time for video concatenation
        video_concat_end_time = time.time()
        total_video_concat_time = video_concat_end_time - video_concat_start_time

        # Save the final video URL in the database
        final_video_url = f"/download/{os.path.basename(final_video_path)}"
        new_history = models.EditHistory(inputVideo="segments", outputVideo=os.path.basename(final_video_path), subtitle="segments", time=str(total_video_concat_time), user_id=user.id)
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


@router.get("/download/{filename}", status_code=200)
async def download_video(filename: str):
    """API to allow users to download the trimmed video."""
    file_path = os.path.join(STATIC_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="video/mp4", filename=filename)