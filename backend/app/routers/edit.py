from fastapi import Depends, APIRouter, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
import shutil
import os
from ..utils import load_subtitles, analyze_excitement, save_timestamps, create_clips, MODEL_REGISTRY
from ..oauth2 import get_current_user
import time
import subprocess
import uuid
from ..schemas import TrimVideoRequest
from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "..", "static")


@router.get("/models/", status_code=200)
def list_models():
    """Return available NLP models."""
    return [
        {"key": k, "name": v["name"], "model_id": v["model_id"]}
        for k, v in MODEL_REGISTRY.items()
    ]


@router.post("/create_segments/", status_code=201)
async def create_segments(
    video: UploadFile = File(...),
    subtitle: UploadFile = File(...),
    model_key: str = Form(default="bert"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Receive video & subtitle, run NLP analysis with chosen model, create segments."""

    if model_key not in MODEL_REGISTRY:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown model '{model_key}'. Available: {list(MODEL_REGISTRY.keys())}",
        )

    if not subtitle.filename.endswith(".srt"):
        raise HTTPException(status_code=400, detail="Only .srt subtitle files are supported.")

    unique_video_filename = f"{uuid.uuid4()}_{video.filename}"
    unique_subtitle_filename = f"{uuid.uuid4()}_{subtitle.filename}"

    video_path = os.path.join(STATIC_DIR, unique_video_filename)
    subtitle_path = os.path.join(STATIC_DIR, unique_subtitle_filename)

    os.makedirs(STATIC_DIR, exist_ok=True)

    with open(video_path, "wb") as f:
        shutil.copyfileobj(video.file, f)
    with open(subtitle_path, "wb") as f:
        shutil.copyfileobj(subtitle.file, f)

    subtitles = load_subtitles(subtitle_path)
    if not subtitles:
        raise HTTPException(status_code=400, detail="No subtitles found in file.")

    # analyze_excitement now returns (timestamps, metrics)
    timestamps, metrics = analyze_excitement(subtitles, model_key=model_key)

    timestamps_file = os.path.join(STATIC_DIR, f"{uuid.uuid4()}_high_sentiment.txt")
    save_timestamps(timestamps, timestamps_file)

    segment_creation_start = time.time()
    segment_paths = create_clips(video_path, timestamps_file, STATIC_DIR)
    total_segment_creation_time = time.time() - segment_creation_start

    for segment in segment_paths:
        new_filename = f"{uuid.uuid4()}_{os.path.basename(segment)}"
        new_path = os.path.join(STATIC_DIR, new_filename)
        os.rename(segment, new_path)
        new_segment = models.Segments(user_id=user.id, segment=new_filename, video=unique_video_filename)
        db.add(new_segment)

    new_history = models.EditHistory(
        inputVideo=unique_video_filename,
        subtitle=unique_subtitle_filename,
        user_id=user.id,
        model_key=model_key,
        analysis_time=metrics["analysis_time"],
        highlights_found=metrics["highlights_found"],
        avg_confidence=metrics["avg_confidence"],
        model_load_time=metrics["model_load_time"],
    )
    db.add(new_history)
    db.commit()

    segment_urls = [f"{os.path.basename(s)}" for s in segment_paths]

    return {
        "message": "Processing complete",
        "segment_urls": segment_urls,
        "video_url": unique_video_filename,
        "subtitle_url": unique_subtitle_filename,
        "total_segments": len(segment_paths),
        "total_time": total_segment_creation_time,
        "metrics": metrics,
    }


@router.post("/upload_assets/", status_code=200)
async def upload_assets(
    video: UploadFile = File(...),
    subtitle: UploadFile = File(...),
    user=Depends(get_current_user),
):
    """Upload video and subtitle, return unique paths for WebSocket analysis."""
    unique_video_filename = f"{uuid.uuid4()}_{video.filename}"
    unique_subtitle_filename = f"{uuid.uuid4()}_{subtitle.filename}"

    video_path = os.path.join(STATIC_DIR, unique_video_filename)
    subtitle_path = os.path.join(STATIC_DIR, unique_subtitle_filename)

    os.makedirs(STATIC_DIR, exist_ok=True)

    with open(video_path, "wb") as f:
        shutil.copyfileobj(video.file, f)
    with open(subtitle_path, "wb") as f:
        shutil.copyfileobj(subtitle.file, f)

    return {
        "video_path": video_path,
        "subtitle_path": subtitle_path,
        "video_filename": unique_video_filename,
        "subtitle_filename": unique_subtitle_filename,
    }


@router.websocket("/ws/analyze")
async def websocket_analyze(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    try:
        # 1. Receive Initial Config
        data = await websocket.receive_text()
        config = json.loads(data)
        
        video_path = config.get("video_path")
        subtitle_path = config.get("subtitle_path")
        model_key = config.get("model_key", "bert")
        user_id = config.get("user_id")
        unique_video_filename = config.get("video_filename")
        unique_subtitle_filename = config.get("subtitle_filename")

        if not all([video_path, subtitle_path, user_id]):
            await websocket.send_text(json.dumps({"type": "error", "message": "Missing configuration parameters"}))
            await websocket.close()
            return

        async def ws_logger(message):
            try:
                await websocket.send_text(json.dumps({"type": "log", "message": message}))
            except Exception as e:
                print(f"Error sending log: {e}")


        await ws_logger("Initializing analysis pipeline...")

        # 2. Load Subtitles
        subtitles = load_subtitles(subtitle_path)
        await ws_logger(f"Subtitles loaded. Total: {len(subtitles)}")

        # 3. Analyze Excitement
        # Note: analyze_excitement is synchronous, so we run it in a thread 
        # or just await it if we wrap it. For now, we'll call it directly
        # but we need to pass the logger.
        
        # We wrap the synchronous calls to keep the event loop alive for the websocket
        loop = asyncio.get_event_loop()
        
        await ws_logger(f"Starting sentiment analysis with {model_key} model...")
        
        # Helper to bridge async logger to sync callback
        def sync_logger(msg):
            # We use call_soon_threadsafe to schedule the log sending on the main loop
            loop.call_soon_threadsafe(lambda: asyncio.create_task(ws_logger(msg)))


        # Run analysis in a separate thread to not block the heartbeats/WS
        timestamps, metrics = await loop.run_in_executor(
            None, analyze_excitement, subtitles, model_key, sync_logger
        )

        timestamps_file = os.path.join(STATIC_DIR, f"{uuid.uuid4()}_high_sentiment.txt")
        save_timestamps(timestamps, timestamps_file)

        # 4. Create Clips
        await ws_logger("Analysis complete. Generating video segments...")
        segment_paths = await loop.run_in_executor(
            None, create_clips, video_path, timestamps_file, STATIC_DIR, sync_logger
        )

        # 5. Save to Database
        print(f"Finalizing analysis for user {user_id}...")
        await ws_logger("Finalizing and saving to database...")
        
        # Ensure user_id is an integer for the database
        try:
            user_id_int = int(user_id)
        except:
            user_id_int = user_id

        for segment in segment_paths:
            new_filename = f"{uuid.uuid4()}_{os.path.basename(segment)}"
            new_path = os.path.join(STATIC_DIR, new_filename)
            print(f"Renaming {segment} -> {new_path}")
            os.rename(segment, new_path)
            new_segment = models.Segments(user_id=user_id_int, segment=new_filename, video=unique_video_filename)
            db.add(new_segment)

        print("Creating edit history record...")
        new_history = models.EditHistory(
            inputVideo=unique_video_filename,
            subtitle=unique_subtitle_filename,
            user_id=user_id_int,
            model_key=model_key,
            analysis_time=metrics["analysis_time"],
            highlights_found=metrics["highlights_found"],
            avg_confidence=metrics["avg_confidence"],
            model_load_time=metrics["model_load_time"],
        )
        db.add(new_history)
        db.commit()
        print("Database transaction committed.")

        # Give a small window for pending logs to flush before sending complete
        await asyncio.sleep(0.5)

        await websocket.send_text(json.dumps({
            "type": "complete",
            "video_url": unique_video_filename,
            "message": "All processing completed successfully!"
        }))
        print("Completion message sent via WebSocket.")


    except WebSocketDisconnect:
        print("Client disconnected during analysis")
    except Exception as e:
        import traceback
        traceback.print_exc()
        await websocket.send_text(json.dumps({"type": "error", "message": f"Server Error: {str(e)}"}))
    finally:
        try:
            await websocket.close()
        except:
            pass


@router.post("/trim_video/", status_code=201)
async def trim_video_api(
    request: TrimVideoRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    segment_names = request.segment_names
    if not segment_names:
        raise HTTPException(status_code=400, detail="No segments selected.")

    segment_files = []
    for name in segment_names:
        path = os.path.join(STATIC_DIR, name)
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail=f"Segment {name} not found.")
        segment_files.append(path)

    video_concat_start = time.time()
    concat_list_file = os.path.join(STATIC_DIR, f"concat_list_{uuid.uuid4()}.txt")

    try:
        with open(concat_list_file, "w", encoding="utf-8") as f:
            for sf in segment_files:
                f.write(f"file '{sf.replace(chr(92), '/')}'\n")

        final_video_path = os.path.join(STATIC_DIR, f"final_output_{user.id}_{uuid.uuid4()}.mp4")
        ffmpeg_path = "ffmpeg"

        command = [
            ffmpeg_path, "-f", "concat", "-safe", "0",
            "-i", concat_list_file, "-c", "copy", "-y", final_video_path,
        ]

        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"FFmpeg Error: {result.stderr}")

        os.remove(concat_list_file)

        total_video_concat_time = time.time() - video_concat_start
        final_video_url = os.path.basename(final_video_path)

        last_edit = (
            db.query(models.EditHistory)
            .filter(models.EditHistory.user_id == user.id)
            .order_by(models.EditHistory.id.desc())
            .first()
        )
        input_video = last_edit.inputVideo if last_edit else "unknown_video.mp4"
        subtitle = last_edit.subtitle if last_edit else "unknown_subtitle.srt"

        new_history = models.EditHistory(
            inputVideo=input_video,
            outputVideo=final_video_url,
            subtitle=subtitle,
            time=str(total_video_concat_time),
            user_id=user.id,
        )
        db.add(new_history)
        db.commit()

        return {
            "message": "Video concatenation complete",
            "final_video_url": final_video_url,
            "total_time": total_video_concat_time,
        }

    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(ex)}")
    finally:
        if os.path.exists(concat_list_file):
            os.remove(concat_list_file)
