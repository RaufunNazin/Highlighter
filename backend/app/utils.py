import bcrypt
from transformers import pipeline
import re
import subprocess
import os
import time
from datetime import datetime, timedelta
import uuid

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_byte_enc = plain_password.encode('utf-8')
    hashed_password_byte_enc = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_byte_enc, hashed_password_byte_enc)

# -------------------- Model Registry --------------------

MODEL_REGISTRY = {
    "bert": {
        "name": "BERT Multilingual",
        "model_id": "nlptown/bert-base-multilingual-uncased-sentiment",
        "task": "sentiment-analysis",
        "label_type": "star_rating",
    },
    "distilbert": {
        "name": "DistilBERT",
        "model_id": "distilbert-base-uncased-finetuned-sst-2-english",
        "task": "sentiment-analysis",
        "label_type": "pos_neg",
    },
    "albert": {
        "name": "ALBERT",
        "model_id": "textattack/albert-base-v2-SST-2",
        "task": "sentiment-analysis",
        "label_type": "pos_neg",
    },
    "roberta": {
        "name": "RoBERTa",
        "model_id": "cardiffnlp/twitter-roberta-base-sentiment-latest",
        "task": "sentiment-analysis",
        "label_type": "pos_neg",
    },
}

# Keyword logic removed as requested

# -------------------- Subtitle Loader --------------------

def load_subtitles(subtitle_file):
    print("Loading subtitles...")
    start_time = time.time()

    with open(subtitle_file, "r", encoding="utf-8") as f:
        lines = f.readlines()

    subtitles = []
    current_subtitle = {"start": None, "end": None, "text": ""}

    for line in lines:
        line = line.strip()
        if "-->" in line:
            times = line.split(" --> ")
            current_subtitle["start"] = times[0]
            current_subtitle["end"] = times[1]
        elif line == "":
            if current_subtitle["start"] and current_subtitle["text"]:
                subtitles.append(current_subtitle)
                current_subtitle = {"start": None, "end": None, "text": ""}
        else:
            current_subtitle["text"] += " " + line

    print(f"Subtitles loaded. Total: {len(subtitles)} (Time: {time.time() - start_time:.2f}s)")
    return subtitles

# -------------------- Score Normalizer --------------------

def _normalize_score(result: dict, label_type: str):
    label = result["label"].upper()
    confidence = result["score"]

    if label_type == "star_rating":
        try:
            rating = int(label[0])
        except (ValueError, IndexError):
            rating = 3
        excitement_score = (rating - 1) / 4.0
    else:
        if "positive" in label.lower() or label == "LABEL_2":
            excitement_score = confidence
        elif "neutral" in label.lower() or label == "LABEL_1":
            excitement_score = confidence * 0.4
        else:
            excitement_score = 1.0 - confidence

    return excitement_score, confidence

# -------------------- Main Analysis --------------------

def analyze_excitement(subtitles, model_key: str = "bert", logger=None):
    def log(msg):
        print(msg)
        if logger:
            logger(msg)

    """Returns (merged_timestamps, metrics_dict)."""
    model_info = MODEL_REGISTRY.get(model_key)
    if model_info is None:
        raise ValueError(f"Unknown model key '{model_key}'. Choose from: {list(MODEL_REGISTRY.keys())}")

    log(f"\nLoading model: {model_info['name']} ...")
    model_load_start = time.time()
    sentiment_pipeline = pipeline(
        model_info["task"],
        model=model_info["model_id"],
        truncation=True,
        max_length=512,
    )
    model_load_time = time.time() - model_load_start
    log(f"Model loaded. ({model_load_time:.2f}s)")

    exciting_timestamps = []
    confidence_scores = []
    highlights_found = 0

    log("\nAnalyzing subtitles...")
    analysis_start = time.time()

    for i, subtitle in enumerate(subtitles):
        text = subtitle["text"].strip()
        if not text:
            continue

        start_time = subtitle["start"]
        end_time = subtitle["end"]

        result = sentiment_pipeline(text)[0]
        excitement_score, confidence = _normalize_score(result, model_info["label_type"])
        confidence_scores.append(confidence)

        if excitement_score >= 0.98:
            adjusted_start, adjusted_end = adjust_timestamps(start_time, end_time)
            exciting_timestamps.append((adjusted_start, adjusted_end))
            highlights_found += 1

        if i % 10 == 0:
            log(f"Processed {i+1}/{len(subtitles)} subtitles...")

    analysis_time = time.time() - analysis_start
    avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0

    safe_analysis_time = max(0.1, analysis_time)
    safe_load_time = max(0.1, model_load_time)
    efficiency_score = (avg_confidence * (highlights_found / max(1, len(subtitles)))) / (safe_analysis_time * safe_load_time)
    
    metrics = {
        "model_key": model_key,
        "model_name": model_info["name"],
        "model_id": model_info["model_id"],
        "model_load_time": round(model_load_time, 3),
        "analysis_time": round(analysis_time, 3),
        "total_subtitles": len(subtitles),
        "highlights_found": highlights_found,
        "avg_confidence": round(avg_confidence, 4),
        "efficiency_score": round(efficiency_score, 4),
    }

    log(f"Done. Highlights: {highlights_found} | Time: {analysis_time:.2f}s | Avg conf: {avg_confidence:.4f} | Eff: {efficiency_score:.4f}")
    merged = merge_overlapping_timestamps(exciting_timestamps)
    return merged, metrics

# -------------------- Timestamp Helpers --------------------

def adjust_timestamps(start, end):
    start_dt = datetime.strptime(start, "%H:%M:%S,%f")
    end_dt = datetime.strptime(end, "%H:%M:%S,%f")
    # No extra padding, just use the subtitle duration
    return start_dt.strftime("%H:%M:%S,%f")[:-3], end_dt.strftime("%H:%M:%S,%f")[:-3]


def merge_overlapping_timestamps(timestamps):
    if not timestamps:
        return []
    merged_timestamps = []
    timestamps.sort()
    current_start, current_end = timestamps[0]
    for next_start, next_end in timestamps[1:]:
        current_end_dt = datetime.strptime(current_end, "%H:%M:%S,%f")
        next_start_dt = datetime.strptime(next_start, "%H:%M:%S,%f")
        # Only merge if they strictly overlap or touch (0s gap tolerance)
        if next_start_dt <= current_end_dt:
            current_end = max(current_end, next_end)
        else:
            merged_timestamps.append((current_start, current_end))
            current_start, current_end = next_start, next_end
    merged_timestamps.append((current_start, current_end))
    return merged_timestamps


def save_timestamps(timestamps, output_file="high_sentiment.txt"):
    with open(output_file, "w") as f:
        for start, end in timestamps:
            f.write(f"{start},{end}\n")
    print(f"Saved {len(timestamps)} timestamps to {output_file}")


def convert_to_seconds(timestamp):
    match = re.match(r"(\d{2}):(\d{2}):(\d{2}),(\d{3})", timestamp)
    if match:
        h, m, s, ms = match.groups()
        return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000
    raise ValueError(f"Invalid timestamp format: {timestamp}")


def create_clips(input_file, timestamps_file, output_folder, logger=None):
    def log(msg):
        print(msg)
        if logger:
            logger(msg)
    start_time = time.time()
    os.makedirs(output_folder, exist_ok=True)
    timestamps = []
    with open(timestamps_file, "r") as f:
        for line in f:
            parts = line.strip().split(",")
            if len(parts) < 4:
                continue
            start = ",".join(parts[:2])
            end = ",".join(parts[2:])
            timestamps.append((convert_to_seconds(start), convert_to_seconds(end)))

    segment_paths = []
    ffmpeg_path = "ffmpeg"
    log(f"Starting segment extraction. Total segments: {len(timestamps)}")
    
    for idx, (start, end) in enumerate(timestamps):
        output_file = os.path.join(output_folder, f"{uuid.uuid4()}.mp4")
        command = [ffmpeg_path, "-i", input_file, "-ss", str(start), "-to", str(end),
                   "-c:v", "libx264", "-c:a", "aac", "-y", output_file]
        
        log(f"\n[FFMPEG] Processing Segment {idx+1}/{len(timestamps)}: {start}s -> {end}s")
        
        try:
            # We use stderr=subprocess.STDOUT because FFmpeg writes progress/logs to stderr
            process = subprocess.Popen(
                command, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.STDOUT, 
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            # Stream the output line by line
            for line in process.stdout:
                line = line.strip()
                if line:
                    log(f"  > {line}")
            
            process.wait()
            
            if process.returncode == 0:
                segment_paths.append(output_file)
                log(f"[FFMPEG] Segment {idx+1} complete.")
            else:
                log(f"[FFMPEG] Error: Segment {idx+1} failed with return code {process.returncode}")
                
        except Exception as e:
            log(f"[FFMPEG] Critical Error on segment {idx+1}: {str(e)}")

    log(f"\nTotal extraction time: {time.time()-start_time:.2f}s")
    return segment_paths


def trim_video(input_file, timestamps_file, output_folder):
    start_time = time.time()
    os.makedirs(output_folder, exist_ok=True)
    timestamps = []
    with open(timestamps_file, "r") as f:
        for line in f:
            parts = line.strip().split(",")
            if len(parts) < 4:
                continue
            timestamps.append((convert_to_seconds(",".join(parts[:2])), convert_to_seconds(",".join(parts[2:]))))

    video_filters = [f"[0:v]trim=start={s}:end={e},setpts=PTS-STARTPTS[v{i}]" for i,(s,e) in enumerate(timestamps)]
    audio_filters = [f"[0:a]atrim=start={s}:end={e},asetpts=PTS-STARTPTS[a{i}]" for i,(s,e) in enumerate(timestamps)]
    n = len(timestamps)
    concat_video = f"{''.join(f'[v{i}]' for i in range(n))}concat=n={n}:v=1:a=0[vout]"
    concat_audio = f"{''.join(f'[a{i}]' for i in range(n))}concat=n={n}:v=0:a=1[aout]"
    filter_complex = ";".join(video_filters + audio_filters + [concat_video, concat_audio, "[vout][aout]concat=n=1:v=1:a=1[outv][outa]"])

    final_output = os.path.join(output_folder, "final_output.mp4")
    ffmpeg_path = "ffmpeg"
    command = [ffmpeg_path, "-i", input_file, "-filter_complex", filter_complex,
               "-map", "[outv]", "-map", "[outa]", "-c:v", "libx264", "-c:a", "aac", "-y", final_output]
    try:
        subprocess.run(command, check=True)
        print(f"Final video: {final_output}")
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")
    print(f"Total time: {time.time()-start_time:.2f}s")


# -------------------- New Timeline Helpers --------------------

def get_video_duration(input_file: str) -> float:
    """Return duration of video in seconds using ffprobe (no decoding)."""
    command = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        input_file,
    ]
    try:
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return float(result.stdout.strip())
    except Exception as e:
        print(f"[ffprobe] Could not determine duration: {e}")
        return 0.0


def trim_video_from_segments(input_file: str, segments: list, output_folder: str, logger=None) -> str:
    """
    Trim and concatenate segments from the source video in a single FFmpeg pass.
    """
    def log(msg):
        print(msg)
        if logger:
            logger(msg)

    if not segments:
        raise ValueError("segments list must not be empty")

    os.makedirs(output_folder, exist_ok=True)
    t0 = time.time()

    video_filters = [
        f"[0:v]trim=start={seg['start']}:end={seg['end']},setpts=PTS-STARTPTS[v{i}]"
        for i, seg in enumerate(segments)
    ]
    audio_filters = [
        f"[0:a]atrim=start={seg['start']}:end={seg['end']},asetpts=PTS-STARTPTS[a{i}]"
        for i, seg in enumerate(segments)
    ]
    n = len(segments)
    concat_video = f"{''.join(f'[v{i}]' for i in range(n))}concat=n={n}:v=1:a=0[vout]"
    concat_audio = f"{''.join(f'[a{i}]' for i in range(n))}concat=n={n}:v=0:a=1[aout]"
    filter_complex = ";".join(video_filters + audio_filters + [concat_video, concat_audio])

    final_output = os.path.join(output_folder, f"{uuid.uuid4()}_highlight.mp4")
    command = [
        "ffmpeg", "-i", input_file,
        "-filter_complex", filter_complex,
        "-map", "[vout]", "-map", "[aout]",
        "-c:v", "libx264", "-c:a", "aac",
        "-y", final_output,
    ]

    log(f"[trim_video_from_segments] FFmpeg pass for {n} segment(s)...")
    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        for line in process.stdout:
            line = line.strip()
            if line:
                log(f"  > {line}")
        process.wait()
        if process.returncode != 0:
            raise RuntimeError(f"FFmpeg failed with code {process.returncode}")
    except Exception as e:
        raise RuntimeError(f"FFmpeg execution failed: {str(e)}")

    log(f"[trim_video_from_segments] Done in {time.time()-t0:.2f}s → {final_output}")
    return final_output


# -------------------- Evaluation Helpers --------------------

def calculate_ml_metrics(predicted_timestamps, ground_truth_timestamps):
    """
    Calculate Precision, Recall, and F1-Score based on timestamp overlap.
    Timestamps are expected as lists of tuples (start_seconds, end_seconds).
    """
    def overlap(t1, t2):
        return max(0, min(t1[1], t2[1]) - max(t1[0], t2[0]))

    true_positives = 0
    matched_gt = set()

    for pred in predicted_timestamps:
        match_found = False
        for i, gt in enumerate(ground_truth_timestamps):
            if overlap(pred, gt) > 0:
                match_found = True
                matched_gt.add(i)
                break
        if match_found:
            true_positives += 1

    false_positives = len(predicted_timestamps) - true_positives
    false_negatives = len(ground_truth_timestamps) - len(matched_gt)

    precision = true_positives / len(predicted_timestamps) if predicted_timestamps else 0.0
    recall = true_positives / len(ground_truth_timestamps) if ground_truth_timestamps else 0.0
    f1_score = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1_score, 4),
        "true_positives": true_positives,
        "false_positives": false_positives,
        "false_negatives": false_negatives
    }
