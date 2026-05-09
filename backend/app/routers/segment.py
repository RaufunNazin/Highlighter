from .. import models
from fastapi import APIRouter, Depends, Form, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from fastapi.responses import JSONResponse
from ..oauth2 import get_current_user, check_authorization

router = APIRouter()

# save user's segment to the database
@router.post("/segments", tags=['edit'], status_code=201)
def save_segment(segment: str = Form(...), video: str = Form(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    new_segment = models.Segments(user_id=user.id, segment=segment, video=video)
    db.add(new_segment)
    db.commit()
    db.refresh(new_segment)
    return new_segment

# get current user's segments
@router.get("/segments/user/{user_id}", tags=['edit'], status_code=200)
def get_segment(user_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Users can only access their own segments
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    segment = db.query(models.Segments).filter(models.Segments.user_id == user_id).all()
    return segment

# get segment by segment id — scoped to current user
@router.get("/segments/segment/{segment_id}", tags=['edit'], status_code=200)
def get_segment_by_id(segment_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    segment = db.query(models.Segments).filter(
        models.Segments.id == segment_id,
        models.Segments.user_id == user.id,
    ).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    return segment

# get user's segments by video name — scoped to current user
@router.get("/segments/video/{video_name}", tags=['edit'], status_code=200)
def get_segment_by_video(video_name: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    segment = db.query(models.Segments).filter(
        models.Segments.video == video_name,
        models.Segments.user_id == user.id,
    ).all()
    return segment

# update user's segment by segment id from the database
@router.put("/segments/{segment_id}", tags=['edit'], status_code=200)
def update_segment(segment_id: int, segment: str = Form(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    db_segment = db.query(models.Segments).filter(
        models.Segments.id == segment_id,
        models.Segments.user_id == user.id,
    ).first()
    if not db_segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    db_segment.segment = segment
    db.commit()
    db.refresh(db_segment)
    return db_segment

# delete user's segment by segment id from the database
@router.delete("/segments/{segment_id}", tags=['edit'], status_code=204)
def delete_segment(segment_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    segment = db.query(models.Segments).filter(
        models.Segments.id == segment_id,
        models.Segments.user_id == user.id,
    ).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    db.delete(segment)
    db.commit()
    return JSONResponse(status_code=204, content="deleted")