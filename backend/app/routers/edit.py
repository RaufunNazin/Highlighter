from fastapi import Depends, APIRouter, HTTPException, File, UploadFile, Form
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
import shutil
import os
from pydantic import BaseModel
from ..utils import load_subtitles, analyze_excitement, save_timestamps, trim_video
from ..oauth2 import check_authorization, get_current_user

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")

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
def get_history(user_id: int, db: Session = Depends(get_db)):
    history = db.query(models.EditHistory).filter(models.EditHistory.user_id == user_id).all()
    return history

# get user's edit history by history id from the database
@router.get("/history/{history_id}", tags=['edit'], status_code=200)
def get_history(history_id: int, db: Session = Depends(get_db)):
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

@router.post("/upload/", status_code=201)
async def upload_files(video: UploadFile = File(...), subtitle: UploadFile = File(...)):
    """API to receive video & subtitle file, process subtitles, save timestamps, and trim the video."""

    # Ensure subtitle file is .srt
    if not subtitle.filename.endswith(".srt"):
        raise HTTPException(status_code=400, detail="Only .srt subtitle files are supported.")

    # Save uploaded files
    video_path = os.path.join(STATIC_DIR, video.filename)
    subtitle_path = os.path.join(STATIC_DIR, subtitle.filename)

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

    # Trim video using generated timestamps
    trimmed_video_path = os.path.join(STATIC_DIR, "trimmed_output.mp4")
    trim_video(video_path, timestamps_file, STATIC_DIR)

    # Return the trimmed video URL
    trimmed_video_url = f"/download/{os.path.basename(trimmed_video_path)}"
    return {"message": "Processing complete", "video_url": trimmed_video_url}

@router.get("/download/{filename}", status_code=200)
async def download_video(filename: str):
    """API to allow users to download the trimmed video."""
    file_path = os.path.join(STATIC_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="video/mp4", filename=filename)