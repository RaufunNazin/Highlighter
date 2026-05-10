from .celery_app import celery_app
from .utils import load_subtitles, analyze_excitement, save_timestamps, create_clips
from .database import SessionLocal
from . import models
import os
import uuid
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "..", "static")

@celery_app.task(bind=True, name="app.tasks.process_video_task")
def process_video_task(self, video_filename: str, subtitle_filename: str, model_key: str, user_id: int):
    task_id = self.request.id
    db = SessionLocal()
    job = None
    
    video_path = os.path.join(STATIC_DIR, video_filename)
    subtitle_path = os.path.join(STATIC_DIR, subtitle_filename)
    
    try:
        # Update job status to processing
        job = db.query(models.ProcessingJob).filter(models.ProcessingJob.id == task_id).first()
        if job:
            job.status = "processing"
            db.commit()

        # Logger function to capture logs
        local_logs = []
        def sync_logger(msg):
            local_logs.append(msg)
            self.update_state(state='PROCESSING', meta={'logs': list(local_logs)})
            print(f"[Task {task_id}] {msg}")

        sync_logger("Initializing analysis pipeline...")

        # 2. Load Subtitles
        subtitles = load_subtitles(subtitle_path)
        sync_logger(f"Subtitles loaded. Total: {len(subtitles)}")

        # 3. Analyze Excitement
        sync_logger(f"Starting sentiment analysis with {model_key} model...")
        timestamps, metrics = analyze_excitement(subtitles, model_key, sync_logger)

        timestamps_file = os.path.join(STATIC_DIR, f"{uuid.uuid4()}_high_sentiment.txt")
        save_timestamps(timestamps, timestamps_file)

        # 4. Create Clips
        sync_logger("Analysis complete. Generating video segments...")
        segment_paths = create_clips(video_path, timestamps_file, STATIC_DIR, sync_logger)

        # 5. Save to Database
        sync_logger("Finalizing and saving to database...")
        
        for segment in segment_paths:
            new_filename = f"{uuid.uuid4()}_{os.path.basename(segment)}"
            new_path = os.path.join(STATIC_DIR, new_filename)
            os.rename(segment, new_path)
            new_segment = models.Segments(user_id=user_id, segment=new_filename, video=video_filename)
            db.add(new_segment)

        new_history = models.EditHistory(
            inputVideo=video_filename,
            subtitle=subtitle_filename,
            user_id=user_id,
            model_key=model_key,
            analysis_time=metrics["analysis_time"],
            highlights_found=metrics["highlights_found"],
            avg_confidence=metrics["avg_confidence"],
            model_load_time=metrics["model_load_time"],
        )
        db.add(new_history)
        
        if job:
            job.status = "completed"
            job.completed_at = str(datetime.utcnow())
            
        db.commit()
        sync_logger("All processing completed successfully!")
        
        return {"status": "success", "video_url": video_filename, "metrics": metrics}

    except Exception as e:
        import traceback
        traceback.print_exc()
        if job:
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = str(datetime.utcnow())
            db.commit()
        raise e
    finally:
        db.close()

@celery_app.task(bind=True, name="app.tasks.analyze_only_task")
def analyze_only_task(self, video_filename: str, subtitle_filename: str, model_key: str, user_id: int):
    task_id = self.request.id
    db = SessionLocal()
    job = None
    video_path = os.path.join(STATIC_DIR, video_filename)
    subtitle_path = os.path.join(STATIC_DIR, subtitle_filename)
    try:
        job = db.query(models.ProcessingJob).filter(models.ProcessingJob.id == task_id).first()
        if job:
            job.status = "processing"
            db.commit()

        local_logs = []
        def sync_logger(msg):
            local_logs.append(msg)
            self.update_state(state='PROCESSING', meta={'logs': list(local_logs)})
            print(f"[Task {task_id}] {msg}")

        sync_logger("Initializing analysis pipeline...")
        subtitles = load_subtitles(subtitle_path)
        sync_logger(f"Subtitles loaded. Total: {len(subtitles)}")

        sync_logger(f"Starting sentiment analysis with {model_key} model...")
        timestamps, metrics = analyze_excitement(subtitles, model_key, sync_logger)

        from .utils import get_video_duration, convert_to_seconds
        video_duration = get_video_duration(video_path)
        
        segments = []
        for start_str, end_str in timestamps:
            try:
                segments.append({
                    "start": round(convert_to_seconds(start_str), 3),
                    "end": round(convert_to_seconds(end_str), 3),
                    "score": metrics.get("avg_confidence", 0.0),
                })
            except Exception:
                pass
                
        if job:
            job.status = "completed"
            job.completed_at = str(datetime.utcnow())
        db.commit()
        sync_logger("All processing completed successfully!")
        
        return {
            "video_filename": video_filename,
            "subtitle_filename": subtitle_filename,
            "video_duration": video_duration,
            "segments": segments,
            "metrics": metrics
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        if job:
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = str(datetime.utcnow())
            db.commit()
        raise e
    finally:
        db.close()

@celery_app.task(bind=True, name="app.tasks.render_highlights_task")
def render_highlights_task(self, video_filename: str, segments: list, user_id: int):
    task_id = self.request.id
    db = SessionLocal()
    job = None
    try:
        job = db.query(models.ProcessingJob).filter(models.ProcessingJob.id == task_id).first()
        if job:
            job.status = "processing"
            db.commit()

        local_logs = []
        def sync_logger(msg):
            local_logs.append(msg)
            self.update_state(state='PROCESSING', meta={'logs': list(local_logs)})
            print(f"[Task {task_id}] {msg}")
            
        sync_logger("Starting FFmpeg merge process...")
        video_path = os.path.join(STATIC_DIR, video_filename)
        
        from .utils import trim_video_from_segments
        import time
        t0 = time.time()
        
        final_path = trim_video_from_segments(video_path, segments, STATIC_DIR, sync_logger)
        
        total_time = time.time() - t0
        final_video_url = os.path.basename(final_path)
        
        sync_logger(f"Render complete in {total_time:.2f}s!")
        
        new_history = models.EditHistory(
            inputVideo=video_filename,
            outputVideo=final_video_url,
            subtitle="",
            time=str(total_time),
            user_id=user_id,
        )
        db.add(new_history)
        
        if job:
            job.status = "completed"
            job.completed_at = str(datetime.utcnow())
        db.commit()
        
        return {
            "final_video_url": final_video_url,
            "total_time": total_time,
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        if job:
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = str(datetime.utcnow())
            db.commit()
        raise e
    finally:
        db.close()
