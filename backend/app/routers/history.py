from .. import models
from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session
from ..database import get_db
from fastapi.responses import JSONResponse
from ..oauth2 import get_current_user, check_authorization

router = APIRouter()

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