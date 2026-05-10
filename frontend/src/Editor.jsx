import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "./api";
import { FiUploadCloud, FiCpu, FiPlay, FiCheckCircle, FiFileText, FiInfo } from "react-icons/fi";

const MODELS = [
  { key: "bert",       label: "BERT Multilingual",    desc: "Original — best multilingual accuracy" },
  { key: "distilbert", label: "DistilBERT",            desc: "40% faster than BERT, similar accuracy" },
  { key: "albert",     label: "ALBERT",                desc: "Lightweight — low memory footprint" },
  { key: "roberta",    label: "RoBERTa",               desc: "Robust training — strong English sentiment" },
];

const Editor = () => {
  const nav = useNavigate();
  const [video, setVideo] = useState(null);
  const [subtitle, setSubtitle] = useState(null);
  const [selectedModel, setSelectedModel] = useState("bert");
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  useEffect(() => {
    if (!jobId) return;

    let ws = null;
    let connected = false;
    let isCleanedUp = false;

    const connectWS = () => {
      if (isCleanedUp) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const baseURL = api.defaults.baseURL.replace(/^https?:\/\//, "");
      ws = new WebSocket(`${protocol}//${baseURL}ws/jobs/${jobId}`);

      ws.onopen = () => { connected = true; };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "log" && data.logs) {
            setLogs(data.logs);
          }
          if (data.status === "completed" && data.result) {
            isCleanedUp = true;
            localStorage.setItem("lastVideo", data.result.video_filename);
            toast.success("Analysis complete! Opening timeline editor…");
            setJobId(null);
            setLoading(false);
            if (ws) ws.close();
            nav("/timeline", { state: data.result });
          } else if (data.status === "failed") {
            isCleanedUp = true;
            toast.error("Analysis failed. Please check the logs or try again.");
            setJobId(null);
            setLoading(false);
            if (ws) ws.close();
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        // Removed auto-reconnect to prevent ghost loops
      };
    };

    connectWS();

    return () => {
      isCleanedUp = true;
      if (ws) ws.close();
    };
  }, [jobId, nav]);

  const handleSubmit = async () => {
    if (!video || !subtitle) {
      toast.error("Please upload both a video and a subtitle file.");
      return;
    }

    setLoading(true);
    localStorage.removeItem("finalVideo");

    try {
      const formData = new FormData();
      formData.append("video", video);
      formData.append("subtitle", subtitle);
      formData.append("model_key", selectedModel);

      const res = await api.post("/analyze_async/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setJobId(res.data.job_id);

    } catch (error) {
      console.error("Analysis error:", error);
      if (error.response && error.response.status === 401) {
        toast.error("You must be logged in to process videos.");
        nav("/login", { state: { from: window.location.pathname } });
      } else if (error.response && error.response.data && error.response.data.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error("Failed to analyze video. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      <ToastContainer position="top-right" autoClose={3000} theme="light" />

      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Neural Workspace</h1>
          <p className="text-slate-500">Configure your parameters and upload media for analysis.</p>
        </div>

        <div className="glass-panel p-8 md:p-12 space-y-12 bg-white/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-widest text-xs">
                <FiUploadCloud className="text-primary" /> Media Assets
              </h3>
              
              <div className="space-y-6">
                {/* Video Input */}
                <label className="block group cursor-pointer">
                  <span className="text-xs font-bold text-slate-400 mb-3 block uppercase tracking-wider">Source Video</span>
                  <div className={`relative border-2 border-dashed rounded-2xl p-6 transition-all ${video ? "border-green-500/50 bg-green-50/10" : "border-slate-200 hover:border-primary/50 bg-slate-50/50"}`}>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setVideo(e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={loading}
                    />
                    <div className="flex flex-col items-center text-center gap-3">
                      {video ? (
                        <>
                          <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/20">
                            <FiCheckCircle size={20} />
                          </div>
                          <div>
                             <p className="text-sm font-bold text-slate-900 truncate max-w-[180px]" title={video.name}>{video.name}</p>
                             <p className="text-[10px] text-green-600 font-bold uppercase mt-1">Ready for upload</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <FiPlay className="text-slate-300" size={32} />
                          <p className="text-sm text-slate-400">Click or drag to upload video</p>
                        </>
                      )}
                    </div>
                  </div>
                </label>

                {/* Subtitle Input */}
                <label className="block group cursor-pointer">
                  <span className="text-xs font-bold text-slate-400 mb-3 block uppercase tracking-wider">Subtitle Asset (.srt)</span>
                  <div className={`relative border-2 border-dashed rounded-2xl p-6 transition-all ${subtitle ? "border-green-500/50 bg-green-50/10" : "border-slate-200 hover:border-primary/50 bg-slate-50/50"}`}>
                    <input
                      type="file"
                      accept=".srt"
                      onChange={(e) => setSubtitle(e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={loading}
                    />
                    <div className="flex flex-col items-center text-center gap-3">
                      {subtitle ? (
                        <>
                          <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/20">
                            <FiCheckCircle size={20} />
                          </div>
                          <div>
                             <p className="text-sm font-bold text-slate-900 truncate max-w-[180px]" title={subtitle.name}>{subtitle.name}</p>
                             <p className="text-[10px] text-green-600 font-bold uppercase mt-1">Transcript linked</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <FiFileText className="text-slate-300" size={32} />
                          <p className="text-sm text-slate-400">Upload SRT transcription</p>
                        </>
                      )}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-widest text-xs">
                <FiCpu className="text-accent" /> Engine Selection
              </h3>
              <div className="space-y-3">
                {MODELS.map((m) => (
                  <div
                    key={m.key}
                    onClick={() => !loading && setSelectedModel(m.key)}
                    className={`p-4 rounded-xl cursor-pointer border transition-all duration-300 relative group ${
                      selectedModel === m.key
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-slate-100 bg-white hover:border-slate-300"
                    } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className={`font-bold text-sm ${selectedModel === m.key ? "text-primary" : "text-slate-700"}`}>{m.label}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{m.desc}</p>
                      </div>
                      {selectedModel === m.key && <FiCheckCircle className="text-primary" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-3 text-slate-400 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                <FiInfo size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Processing occurs on local server</span>
             </div>
             <button
               onClick={handleSubmit}
               disabled={!video || !subtitle || loading}
               className="btn-primary py-4 px-16 text-lg disabled:opacity-40 shadow-xl shadow-primary/20 w-full md:w-auto"
             >
               {loading ? "Analyzing…" : "Analyze & Open Timeline"}
             </button>
          </div>
        </div>
      </div>

      {jobId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900"><FiCpu className="text-primary"/> Analyzing Video...</h2>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs text-slate-600 space-y-2 relative">
              {logs.map((l, i) => <div key={i}>&gt; {l}</div>)}
              {logs.length === 0 && <div className="animate-pulse">Waiting for background worker...</div>}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
