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
def process_video_task(self, video_path: str, subtitle_path: str, model_key: str, user_id: int, unique_video_filename: str, unique_subtitle_filename: str):
    task_id = self.request.id
    db = SessionLocal()
    
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
            new_segment = models.Segments(user_id=user_id, segment=new_filename, video=unique_video_filename)
            db.add(new_segment)

        new_history = models.EditHistory(
            inputVideo=unique_video_filename,
            subtitle=unique_subtitle_filename,
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
        
        return {"status": "success", "video_url": unique_video_filename, "metrics": metrics}

    except Exception as e:
        import traceback
        traceback.print_exc()
        if job:
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = str(datetime.utcnow())
            db.commit()
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise e
    finally:
        db.close()
