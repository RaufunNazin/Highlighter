import time
import argparse
from app.utils import (
    load_subtitles,
    analyze_excitement,
    save_timestamps,
    MODEL_REGISTRY,
)

# -------------------- CLI --------------------

def parse_args():
    parser = argparse.ArgumentParser(description="Highlighter — football video highlight extractor")
    parser.add_argument(
        "--subtitle",
        default="subtitles.srt",
        help="Path to the .srt subtitle file (default: subtitles.srt)",
    )
    parser.add_argument(
        "--output",
        default="high_sentiment.txt",
        help="Output file for timestamps (default: high_sentiment.txt)",
    )
    parser.add_argument(
        "--model",
        default="bert",
        choices=list(MODEL_REGISTRY.keys()),
        help=f"NLP model to use. Choices: {list(MODEL_REGISTRY.keys())} (default: bert)",
    )
    return parser.parse_args()


# -------------------- Metrics display --------------------

def print_metrics_table(metrics: dict):
    border = "+" + "-" * 38 + "+" + "-" * 20 + "+"
    row = "| {:<36} | {:>18} |"
    print("\n" + border)
    print(row.format("Metric", "Value"))
    print(border)
    print(row.format("Model", metrics["model_name"]))
    print(row.format("Model ID", metrics["model_id"][:36]))
    print(border)
    print(row.format("Model load time (s)", f"{metrics['model_load_time']:.3f}"))
    print(row.format("Analysis time (s)", f"{metrics['analysis_time']:.3f}"))
    print(row.format("Total subtitles", metrics["total_subtitles"]))
    print(row.format("Highlights found", metrics["highlights_found"]))
    print(row.format("Avg confidence", f"{metrics['avg_confidence']:.4f}"))
    print(border)


# -------------------- Run --------------------

if __name__ == "__main__":
    args = parse_args()
    overall_start = time.time()

    print(f"\n{'='*55}")
    print(f"  HighLighter  |  model: {MODEL_REGISTRY[args.model]['name']}")
    print(f"{'='*55}")

    subtitles = load_subtitles(args.subtitle)

    if subtitles:
        timestamps, metrics = analyze_excitement(subtitles, model_key=args.model)
        save_timestamps(timestamps, args.output)
        print_metrics_table(metrics)
    else:
        print("No subtitles found. Please check the subtitle file.")

    total_time = time.time() - overall_start
    print(f"\nTotal wall-clock time: {total_time:.2f}s\n")
