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

# get user's edit history analytics
@router.get("/analytics", tags=['edit'], status_code=200)
def get_analytics(db: Session = Depends(get_db), user = Depends(get_current_user)):
    # Fetch all history items for the user that have metrics
    analytics = db.query(models.EditHistory).filter(
        models.EditHistory.user_id == user.id,
        models.EditHistory.model_key.isnot(None)
    ).all()
    return analytics

# get detailed run history with segments for the current user
@router.get("/my-runs", tags=['edit'], status_code=200)
def get_my_runs(db: Session = Depends(get_db), user = Depends(get_current_user)):
    """Return all edit runs for the current user, including associated segments and metrics."""
    runs = (
        db.query(models.EditHistory)
        .filter(
            models.EditHistory.user_id == user.id,
            models.EditHistory.model_key.isnot(None),
        )
        .order_by(models.EditHistory.id.desc())
        .all()
    )

    results = []
    for run in runs:
        # Find segments associated with this run's input video
        segments = (
            db.query(models.Segments)
            .filter(
                models.Segments.user_id == user.id,
                models.Segments.video == run.inputVideo,
            )
            .all()
        )
        results.append({
            "id": run.id,
            "inputVideo": run.inputVideo,
            "outputVideo": run.outputVideo,
            "subtitle": run.subtitle,
            "model_key": run.model_key,
            "analysis_time": run.analysis_time,
            "model_load_time": run.model_load_time,
            "highlights_found": run.highlights_found,
            "avg_confidence": run.avg_confidence,
            "segments": [{"id": s.id, "segment": s.segment} for s in segments],
        })

    return results