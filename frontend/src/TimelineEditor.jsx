import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import WaveSurfer from "wavesurfer.js";
import api from "./api";
import "./TimelineEditor.css";

// ── helpers ──
const fmt = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${h > 0 ? h + ":" : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const BASE = "http://localhost:8000/static/";

const TimelineEditor = () => {
  const { state } = useLocation();
  const nav = useNavigate();

  // guard: no analysis data → redirect back
  useEffect(() => { if (!state) nav("/editor"); }, [state, nav]);
  if (!state) return null;

  const { video_filename, video_duration, segments: initSegs, metrics } = state;
  const videoUrl = BASE + video_filename;

  // ── state ──
  const [segments, setSegments] = useState(() =>
    (initSegs || []).map((s, i) => ({ id: i, start: s.start, end: s.end }))
  );
  const [zoom, setZoom] = useState(1);
  const [playheadTime, setPlayheadTime] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const videoRef = useRef(null);
  const scrollRef = useRef(null);
  const waveRef = useRef(null);
  const wsRef = useRef(null);
  const nextId = useRef(initSegs ? initSegs.length : 0);

  const TRACK_W = Math.max(900, zoom * 900);
  const pxPerSec = TRACK_W / (video_duration || 1);

  // ── wavesurfer ──
  useEffect(() => {
    if (!waveRef.current || wsRef.current) return;
    const ws = WaveSurfer.create({
      container: waveRef.current,
      url: videoUrl,
      height: 44,
      waveColor: "rgba(56,189,248,.35)",
      progressColor: "rgba(56,189,248,.15)",
      cursorWidth: 0,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      interact: false,
      backend: "MediaElement",
      media: videoRef.current,
    });
    wsRef.current = ws;
    return () => { ws.destroy(); wsRef.current = null; };
  }, [videoUrl]);

  // redraw waveform when zoom changes
  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.setOptions({ width: TRACK_W });
    }
  }, [TRACK_W]);

  // ── video time tracking ──
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setPlayheadTime(v.currentTime);
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, []);

  // ── ruler ticks ──
  const ticks = [];
  const tickInterval = zoom <= 2 ? 30 : zoom <= 6 ? 10 : zoom <= 12 ? 5 : 1;
  for (let t = 0; t <= video_duration; t += tickInterval) {
    ticks.push(t);
  }

  // ── segment CRUD ──
  const updateSeg = useCallback((id, patch) => {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);
  const removeSeg = useCallback((id) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
  }, []);
  const addSegAtTime = useCallback(
    (timeSec) => {
      const GAP = 5;
      const ns = { id: nextId.current++, start: timeSec, end: Math.min(timeSec + GAP, video_duration) };
      // ensure no overlap
      for (const s of segments) {
        if (ns.start < s.end && ns.end > s.start) return; // overlap, ignore
      }
      setSegments((prev) => [...prev, ns].sort((a, b) => a.start - b.start));
    },
    [segments, video_duration]
  );

  // ── drag resize ──
  const handleDrag = useCallback(
    (segId, edge) => (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const seg = segments.find((s) => s.id === segId);
      if (!seg) return;
      const origVal = edge === "left" ? seg.start : seg.end;

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dt = dx / pxPerSec;
        let newVal = origVal + dt;
        if (edge === "left") {
          newVal = clamp(newVal, 0, seg.end - 0.5);
          updateSeg(segId, { start: Math.round(newVal * 10) / 10 });
        } else {
          newVal = clamp(newVal, seg.start + 0.5, video_duration);
          updateSeg(segId, { end: Math.round(newVal * 10) / 10 });
        }
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [segments, pxPerSec, video_duration, updateSeg]
  );

  // ── track click → seek or add ──
  const onTrackClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const timeSec = x / pxPerSec;
    // If click is inside existing segment → seek
    const hit = segments.find((s) => timeSec >= s.start && timeSec <= s.end);
    if (hit) {
      if (videoRef.current) { videoRef.current.currentTime = timeSec; }
    } else {
      addSegAtTime(timeSec);
    }
  };

  // ── minimap click → scroll ──
  const onMinimapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (scrollRef.current) {
      const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
      scrollRef.current.scrollLeft = ratio * maxScroll;
    }
    if (videoRef.current) { videoRef.current.currentTime = ratio * video_duration; }
  };

  // ── zoom ──
  const zoomIn = () => setZoom((z) => Math.min(z * 1.5, 40));
  const zoomOut = () => setZoom((z) => Math.max(z / 1.5, 1));
  const zoomReset = () => setZoom(1);

  // wheel zoom on timeline
  const onWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) zoomIn(); else zoomOut();
    }
  };

  // ── export ──
  const handleExport = async () => {
    if (segments.length === 0) { toast.error("Add at least one segment."); return; }
    setExporting(true);
    try {
      const res = await api.post(
        "/render_highlights/",
        { video_filename, segments: segments.map((s) => ({ start: s.start, end: s.end })) },
      );
      setDownloadUrl(BASE + res.data.final_video_url);
      toast.success(`Render done in ${res.data.total_time.toFixed(1)}s!`);
    } catch (err) {
      console.error(err);
      toast.error("Render failed.");
    } finally {
      setExporting(false);
    }
  };

  // ── minimap viewport ──
  const [scrollRatio, setScrollRatio] = useState({ left: 0, width: 1 });
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const calc = () => {
      const total = el.scrollWidth || 1;
      setScrollRatio({ left: el.scrollLeft / total, width: el.clientWidth / total });
    };
    calc();
    el.addEventListener("scroll", calc);
    window.addEventListener("resize", calc);
    return () => { el.removeEventListener("scroll", calc); window.removeEventListener("resize", calc); };
  }, [zoom]);

  // ── keep total ──
  const keepTotal = segments.reduce((a, s) => a + (s.end - s.start), 0);
  const cutTotal = video_duration - keepTotal;

  return (
    <div className="te-root">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />

      {/* Header */}
      <div className="te-header">
        <h1>Timeline Editor</h1>
        <div className="te-actions">
          <button className="te-btn-secondary" onClick={() => nav("/editor")}>← Back</button>
          <button className="te-btn-export" onClick={handleExport} disabled={exporting || segments.length === 0}>
            {exporting ? "Rendering…" : "Export Highlight"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="te-stats">
        <div className="te-stat"><b>Duration</b>{fmt(video_duration)}</div>
        <div className="te-stat"><b>Keep</b>{fmt(keepTotal)} ({((keepTotal / video_duration) * 100).toFixed(1)}%)</div>
        <div className="te-stat"><b>Cut</b>{fmt(cutTotal)}</div>
        <div className="te-stat"><b>Segments</b>{segments.length}</div>
        {metrics && <div className="te-stat"><b>Model</b>{metrics.model_name || metrics.model_key}</div>}
        {metrics && <div className="te-stat"><b>Confidence</b>{(metrics.avg_confidence * 100).toFixed(1)}%</div>}
      </div>

      {/* Video Preview */}
      <div className="te-video-wrap">
        <video ref={videoRef} src={videoUrl} controls preload="metadata" />
      </div>

      {/* Minimap */}
      <div className="te-minimap" onClick={onMinimapClick}>
        {segments.map((s) => (
          <div key={s.id} className="te-minimap-seg"
            style={{ left: `${(s.start / video_duration) * 100}%`, width: `${((s.end - s.start) / video_duration) * 100}%` }} />
        ))}
        <div className="te-minimap-viewport"
          style={{ left: `${scrollRatio.left * 100}%`, width: `${scrollRatio.width * 100}%` }} />
      </div>

      {/* Zoom controls */}
      <div className="te-zoom-bar">
        <button onClick={zoomOut} title="Zoom out">−</button>
        <span className="te-zoom-label">{zoom.toFixed(1)}×</span>
        <button onClick={zoomIn} title="Zoom in">+</button>
        <button onClick={zoomReset} title="Reset zoom" style={{ fontSize: ".7rem", width: "auto", padding: "0 10px" }}>Reset</button>
        <span style={{ fontSize: ".65rem", color: "#475569" }}>Ctrl + Scroll to zoom</span>
      </div>

      {/* Timeline */}
      <div className="te-timeline-scroll" ref={scrollRef} onWheel={onWheel}>
        <div className="te-timeline-inner" style={{ width: TRACK_W }}>
          {/* Ruler */}
          <div className="te-ruler">
            {ticks.map((t) => (
              <div key={t} className="te-ruler-tick" style={{ left: t * pxPerSec }}>
                <span>{fmt(t)}</span>
              </div>
            ))}
          </div>

          {/* Track */}
          <div className="te-track" onClick={onTrackClick}>
            {segments.map((s) => {
              const left = s.start * pxPerSec;
              const width = (s.end - s.start) * pxPerSec;
              return (
                <div key={s.id} className="te-segment" style={{ left, width }} onClick={(e) => e.stopPropagation()}>
                  <div className="te-handle te-handle-left" onMouseDown={handleDrag(s.id, "left")} />
                  <span className="te-segment-label">{fmt(s.start)} – {fmt(s.end)}</span>
                  <div className="te-handle te-handle-right" onMouseDown={handleDrag(s.id, "right")} />
                </div>
              );
            })}
            {/* Playhead */}
            <div className="te-playhead" style={{ left: playheadTime * pxPerSec }} />
          </div>

          {/* Waveform */}
          <div className="te-waveform-wrap" ref={waveRef} />
        </div>
      </div>

      {/* Segment list */}
      <h3 style={{ fontSize: ".8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".5rem" }}>
        Keep Segments
      </h3>
      <div className="te-seglist">
        {segments.length === 0 && (
          <p style={{ color: "#475569", fontSize: ".85rem", gridColumn: "1 / -1" }}>
            Click an empty area on the timeline to add a segment.
          </p>
        )}
        {segments.map((s) => (
          <div key={s.id} className="te-seglist-item">
            <span>{fmt(s.start)} → {fmt(s.end)} <span style={{ color: "#475569" }}>({(s.end - s.start).toFixed(1)}s)</span></span>
            <button className="te-seglist-remove" onClick={() => removeSeg(s.id)} title="Remove">✕</button>
          </div>
        ))}
      </div>

      {/* Download bar */}
      {downloadUrl && (
        <div className="te-download-bar">
          <span style={{ color: "#e2e8f0" }}>✅ Your highlight video is ready!</span>
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer" download>Download MP4</a>
        </div>
      )}
    </div>
  );
};

export default TimelineEditor;
