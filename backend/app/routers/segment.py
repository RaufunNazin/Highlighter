from .. import models
from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session
from ..database import get_db
from fastapi.responses import JSONResponse
from ..oauth2 import get_current_user, check_authorization

router = APIRouter()

# save user's segment to the database
@router.post("/segments", tags=['edit'], status_code=201)
def save_segment(segment: str = Form(...), user_id: int = Form(...), db: Session = Depends(get_db)):
    new_segment = models.Segments(user_id=user_id, segment=segment)
    db.add(new_segment)
    db.commit()
    db.refresh(new_segment)
    return new_segment

# get user's segment by user id from the database
@router.get("/segments/user/{user_id}", tags=['edit'], status_code=200)
def get_segment(user_id: int, db: Session = Depends(get_db)):
    segment = db.query(models.Segments).filter(models.Segments.user_id == user_id).all()
    return segment

# get user's segment by segment id from the database
@router.get("/segments/segment/{segment_id}", tags=['edit'], status_code=200)
def get_segment(segment_id: int, db: Session = Depends(get_db)):
    segment = db.query(models.Segments).filter(models.Segments.id == segment_id).first()
    return segment

# get user's segment by video name from the database
@router.get("/segments/video/{video_name}", tags=['edit'], status_code=200)
def get_segment_by_video(video_name: str, db: Session = Depends(get_db)):
    segment = db.query(models.Segments).filter(models.Segments.video == video_name).all()
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