from fastapi import Depends, APIRouter, HTTPException, status, File, UploadFile, Path, Form, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from ..database import get_db, SessionLocal
from .. import models, oauth2
from ..models import Photo
import shutil
import os
from pydantic import BaseModel
from app.oauth2 import check_authorization
from app.schemas import EditHistory
from utils import load_subtitles, analyze_excitement

router = APIRouter()
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
def update_history(history_id: int, inputVideo: str = Form(...), outputVideo: str = Form(...), subtitle: str = Form(...), time: str = Form(...), user_id: int = Form(...), db: Session = Depends(get_db)):
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
def delete_history(history_id: int, db: Session = Depends(get_db)):
    history = db.query(models.EditHistory).filter(models.EditHistory.id == history_id).first()
    db.delete(history)
    db.commit()
    return JSONResponse(status_code=204, content="deleted")

# upload video file
@router.post("/upload", tags=['edit'], status_code=201)
def upload_video(file: UploadFile = File(...)):
    file_path = os.path.join("static", file.filename)
    save_file(file, file_path)
    return {"filename": file.filename}

# upload video and subtitle files and analyze excitement level and save to the a file in the server
@router.post("/analyze", tags=['edit'], status_code=201)
def analyze_video(video: UploadFile = File(...), subtitle: UploadFile = File(...)):
    video_path = os.path.join("static", video.filename)
    subtitle_path = os.path.join("static", subtitle.filename)
    save_file(video, video_path)
    save_file(subtitle, subtitle_path)
    subtitles = load_subtitles(subtitle_path)
    excitement = analyze_excitement(subtitles)
    with open("excitement.txt", "w") as f:
        f.write(excitement)
    return {"excitement": excitement}