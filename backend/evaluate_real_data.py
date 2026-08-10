import os
import sys
import difflib
import time

class Logger(object):
    def __init__(self, filename="results.txt"):
        self.terminal = sys.stdout
        self.log = open(filename, "w", encoding="utf-8")

    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)

    def flush(self):
        self.terminal.flush()
        self.log.flush()

sys.stdout = Logger(os.path.join(os.path.dirname(os.path.abspath(__file__)), "results.txt"))


# Ensure we can import from app.utils if run from the backend directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.utils import load_subtitles, analyze_excitement, calculate_ml_metrics, convert_to_seconds

MODELS = ["distilbert", "bert", "albert", "roberta"]

def extract_ground_truth(full_match_subs, official_subs, threshold=0.85):
    """
    Finds where official highlights text appears in the full match.
    Returns a list of (start_seconds, end_seconds) from the full match timeframe.
    """
    print(f"Extracting ground truth from {len(official_subs)} official subtitle lines...")
    matched_full_timestamps = []
    
    # Simple algorithm: for each official sub, find the best matching full sub
    for off_sub in official_subs:
        off_text = off_sub["text"].strip().lower()
        if not off_text or len(off_text) < 10:
            continue # Skip very short or empty subtitles
            
        best_match = None
        best_ratio = 0
        
        for full_sub in full_match_subs:
            full_text = full_sub["text"].strip().lower()
            ratio = difflib.SequenceMatcher(None, off_text, full_text).ratio()
            
            # Subtitle texts might not be exactly equal, but if they match highly, it's the same commentary
            if ratio > best_ratio:
                best_ratio = ratio
                best_match = full_sub
                
        if best_ratio > threshold and best_match:
            try:
                start_sec = convert_to_seconds(best_match["start"])
                end_sec = convert_to_seconds(best_match["end"])
                matched_full_timestamps.append((start_sec, end_sec))
            except Exception as e:
                print(f"Error converting timestamps: {e}")

    # Merge overlapping/adjacent timestamps (tolerance 2 seconds)
    if not matched_full_timestamps:
        return []
        
    matched_full_timestamps.sort(key=lambda x: x[0])
    merged = []
    current_start, current_end = matched_full_timestamps[0]
    
    for next_start, next_end in matched_full_timestamps[1:]:
        if next_start <= current_end + 2.0:
            current_end = max(current_end, next_end)
        else:
            merged.append((current_start, current_end))
            current_start, current_end = next_start, next_end
    merged.append((current_start, current_end))
    
    print(f"Extracted {len(merged)} discrete ground truth segments from the full match.")
    return merged

def run_real_evaluation():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    eval_dir = os.path.join(base_dir, "data", "evaluation")
    
    if not os.path.exists(eval_dir):
        print(f"Evaluation directory not found: {eval_dir}")
        print("Please create it and add matches e.g. data/evaluation/match_01/")
        return
        
    matches = [d for d in os.listdir(eval_dir) if os.path.isdir(os.path.join(eval_dir, d))]
    
    if not matches:
        print("No matches found in data/evaluation/. Add folders with 'full_match.srt' and 'official_highlights.srt'.")
        return
        
    print("=========================================================")
    print("  DUJASE Paper Evaluation: Real-Data Pipeline            ")
    print("=========================================================")
    
    all_results = []
    
    for match_name in matches:
        print(f"\n--- Evaluating Match: {match_name} ---")
        match_folder = os.path.join(eval_dir, match_name)
        
        full_srt_path = os.path.join(match_folder, "full_match.srt")
        official_srt_path = os.path.join(match_folder, "official_highlights.srt")
        
        if not os.path.exists(full_srt_path) or not os.path.exists(official_srt_path):
            print(f"Skipping {match_name}: Missing full_match.srt or official_highlights.srt")
            continue
            
        full_match_subs = load_subtitles(full_srt_path)
        official_subs = load_subtitles(official_srt_path)
        
        ground_truth_timestamps = extract_ground_truth(full_match_subs, official_subs)
        
        if not ground_truth_timestamps:
            print("Could not extract any ground truth timestamps! Ensure subtitles match the same commentary.")
            continue
            
        for model_key in MODELS:
            print(f"\nRunning {model_key.upper()}...")
            try:
                pred_time_strings, metrics_info = analyze_excitement(full_match_subs, model_key)
                
                # Convert predicted strings to seconds
                predicted_timestamps = []
                for start_str, end_str in pred_time_strings:
                    predicted_timestamps.append((convert_to_seconds(start_str), convert_to_seconds(end_str)))
                    
                # Calculate True ML Metrics!
                ml_metrics = calculate_ml_metrics(predicted_timestamps, ground_truth_timestamps)
                
                all_results.append({
                    "Match": match_name,
                    "Model": metrics_info["model_name"],
                    "Precision": ml_metrics["precision"],
                    "Recall": ml_metrics["recall"],
                    "F1-Score": ml_metrics["f1_score"],
                    "True Positives": ml_metrics["true_positives"],
                    "False Positives": ml_metrics["false_positives"],
                    "False Negatives": ml_metrics["false_negatives"]
                })
                
                print(f"Results for {model_key}: Precision: {ml_metrics['precision']:.2f}, Recall: {ml_metrics['recall']:.2f}, F1: {ml_metrics['f1_score']:.2f}")
                
            except Exception as e:
                print(f"Error evaluating {model_key} on {match_name}: {e}")

    if all_results:
        print("\n### Final Evaluation Metrics (Markdown Table for Paper)\n")
        print("| Match | Model | Precision | Recall | F1-Score | True Pos | False Pos | False Neg |")
        print("|-------|-------|-----------|--------|----------|----------|-----------|-----------|")
        for r in all_results:
            print(f"| {r['Match']} | {r['Model']} | {r['Precision']:.2f} | {r['Recall']:.2f} | {r['F1-Score']:.2f} | {r['True Positives']} | {r['False Positives']} | {r['False Negatives']} |")
    else:
        print("\nNo results generated.")

if __name__ == "__main__":
    run_real_evaluation()
