import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "./api";
import { FiCheck, FiVideo, FiArrowRight, FiActivity, FiDownload, FiInfo } from "react-icons/fi";

const Highlights = () => {
  const nav = useNavigate();
  const [segments, setSegments] = useState([]);
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finalVideo, setFinalVideo] = useState(null);

  const videoName = localStorage.getItem("lastVideo");
  const baseURL = api.defaults.baseURL.replace(/\/$/, "");

  useEffect(() => {
    if (!videoName) {
      toast.error("No video found. Upload a video first.");
      nav("/");
      return;
    }
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/segments/video/${videoName}`);
      setSegments(response.data);
    } catch (error) {
      console.error("Error fetching segments:", error);
      toast.error("Failed to fetch segments.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSegment = (segment) => {
    setSelectedSegments((prev) =>
      prev.includes(segment) ? prev.filter((s) => s !== segment) : [...prev, segment]
    );
  };

  const concatenateVideos = async () => {
    if (selectedSegments.length === 0) {
      toast.error("Please select at least one segment.");
      return;
    }
    setProcessing(true);
    try {
      const response = await api.post(
        "/trim_video/",
        { segment_names: selectedSegments },
      );
      setFinalVideo(response.data.final_video_url);
      localStorage.setItem("finalVideo", response.data.final_video_url);
      setFinished(true);
      toast.success("Video created successfully!");
    } catch (error) {
      console.error("Error concatenating videos:", error);
      toast.error("Failed to create final video.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-12">
      <ToastContainer position="top-right" autoClose={3000} theme="light" />

      {loading || processing ? (
        <div className="flex-1 flex flex-col items-center justify-center py-32 gap-8 text-center glass-panel bg-white/80">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/10 blur-3xl rounded-full animate-pulse" />
            <DotLottieReact
              src="https://lottie.host/c6e85f0e-ab1d-432f-9934-9685070ebbe5/lRV5Zqr8tM.lottie"
              loop
              autoplay
              className="w-64 h-64 relative"
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">{loading ? "Harvesting Segments..." : "Merging Highlights..."}</h2>
            <p className="text-slate-400">Processing video data via FFmpeg.</p>
          </div>
        </div>
      ) : finished ? (
        <div className="max-w-4xl mx-auto space-y-12">
           <div className="text-center space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Final Export</h1>
              <p className="text-slate-500">Your highlights have been successfully merged.</p>
           </div>
           
           <div className="glass-panel p-4 bg-white/40 shadow-2xl">
              <video
                src={`${baseURL}/static/${finalVideo}`}
                controls
                className="w-full rounded-xl aspect-video shadow-lg"
              />
           </div>

           <div className="flex flex-col md:flex-row gap-4 justify-center items-center pt-8 border-t border-slate-100">
              <a 
                href={`${baseURL}/static/${finalVideo}`} 
                download
                className="btn-primary py-4 px-12 flex items-center justify-center gap-3 w-full md:w-auto shadow-xl shadow-primary/20"
              >
                <FiDownload /> Download Export
              </a>
              <button 
                onClick={() => nav("/compare")}
                className="btn-glass py-4 px-12 flex items-center justify-center gap-3 w-full md:w-auto border-slate-200"
              >
                <FiActivity /> View Analysis
              </button>
           </div>
        </div>
      ) : (
        <div className="space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-200 pb-12">
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Curation Studio</h1>
              <p className="text-slate-500">Select the sentiment-verified clips you want to include in your final video.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary">
                {selectedSegments.length} Clips Selected
              </div>
              <button
                onClick={concatenateVideos}
                disabled={selectedSegments.length === 0}
                className="btn-primary flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed py-3 px-8"
              >
                Merge Clips <FiArrowRight />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-12">
            {segments.map((segment, i) => (
              <div
                key={segment.id}
                onClick={() => toggleSegment(segment.segment)}
                className={`group relative glass-panel overflow-hidden cursor-pointer transition-all duration-500 bg-white/50 ${
                  selectedSegments.includes(segment.segment)
                    ? "ring-4 ring-primary ring-offset-2 border-primary/50 scale-[0.98]"
                    : "hover:border-slate-300 hover:shadow-lg"
                }`}
              >
                <div className="aspect-video relative overflow-hidden bg-slate-900">
                  <video
                    src={`${baseURL}/static/${segment.segment}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                    muted
                    onMouseOver={(e) => e.target.play()}
                    onMouseOut={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  
                  {selectedSegments.includes(segment.segment) && (
                    <div className="absolute top-4 right-4 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                      <FiCheck className="text-white" />
                    </div>
                  )}
                  
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <span className="text-[10px] font-black text-white drop-shadow-md tracking-widest uppercase bg-black/20 px-2 py-1 rounded backdrop-blur-sm border border-white/10">Segment {i + 1}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {segments.length === 0 && (
            <div className="py-32 text-center glass-panel border-dashed border-slate-200 bg-white/30">
              <FiInfo className="mx-auto text-slate-200 mb-4" size={48} />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Waiting for model output...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Highlights;
