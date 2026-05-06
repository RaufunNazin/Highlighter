import React, { useState } from "react";
import { useNavigate, useBlocker } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "./api";
import { FiUploadCloud, FiCpu, FiPlay, FiCheckCircle, FiFileText, FiInfo, FiChevronDown, FiChevronUp, FiX, FiAlertTriangle } from "react-icons/fi";
import { useEffect, useRef } from "react";

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
  const [logs, setLogs] = useState([]);
  const [showRawLogs, setShowRawLogs] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const logEndRef = useRef(null);
  const logContainerRef = useRef(null);
  const finishedRef = useRef(false);


  const STEPS = [
    "Uploading Assets",
    "Loading AI Model",
    "Sentiment Analysis",
    "Segment Extraction",
    "Finalizing"
  ];

  // Smart scroll: only auto-scroll if user is already near the bottom
  useEffect(() => {
    if (showRawLogs && logContainerRef.current) {
      const container = logContainerRef.current;
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
      if (isAtBottom) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth"
        });
      }
    }
  }, [logs, showRawLogs]);



  // Block navigation during loading
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      loading && !finishedRef.current && currentLocation.pathname !== nextLocation.pathname
  );


  useEffect(() => {
    if (blocker.state === "blocked") {
      setShowExitModal(true);
    }
  }, [blocker]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (loading) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [loading]);

  const handleSubmit = async () => {
    if (!video || !subtitle) {
      toast.error("Please upload both a video and a subtitle file.");
      return;
    }

    setLoading(true);
    finishedRef.current = false;
    setLogs(["[SYSTEM] Initiating secure upload..."]);
    setCurrentStep(0);

    
    try {
      // 1. Fetch user info
      const userRes = await api.get("/me", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const userId = userRes.data.id;

      // 2. Upload Assets
      const formData = new FormData();
      formData.append("video", video);
      formData.append("subtitle", subtitle);
      
      const uploadRes = await api.post("/upload_assets/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setLogs(prev => [...prev, "[SYSTEM] Assets uploaded. Opening Neural Stream..."]);
      setCurrentStep(1);

      // 3. Connect WebSocket
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost = window.location.hostname === "localhost" ? "localhost:8000" : window.location.host;
      const ws = new WebSocket(`${wsProtocol}//${wsHost}/ws/analyze`);

      ws.onopen = () => {
        ws.send(JSON.stringify({
          video_path: uploadRes.data.video_path,
          subtitle_path: uploadRes.data.subtitle_path,
          video_filename: uploadRes.data.video_filename,
          subtitle_filename: uploadRes.data.subtitle_filename,
          model_key: selectedModel,
          user_id: userId
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "log") {
          setLogs(prev => [...prev, data.message]);
          
          // Determine step based on log message
          if (data.message.includes("Starting sentiment analysis")) setCurrentStep(2);
          if (data.message.includes("Generating video segments") || data.message.includes("Starting segment extraction")) setCurrentStep(3);
          if (data.message.includes("Finalizing")) setCurrentStep(4);
        } else if (data.type === "complete") {
          localStorage.setItem("lastVideo", data.video_url);
          finishedRef.current = true;
          setLoading(false);
          toast.success("Analysis complete!");
          nav("/highlights");
        } else if (data.type === "error") {

          console.error("WS Error:", data.message);
          toast.error(data.message);
          setLoading(false);
        }
      };

      ws.onerror = (err) => {
        console.error("WS Error:", err);
        toast.error("Stream connection failed.");
        setLoading(false);
      };

    } catch (error) {
      console.error("Process error:", error);
      toast.error("Failed to process video.");
      setLoading(false);
    }
  };

  const handleExitConfirm = () => {
    setLoading(false);
    setShowExitModal(false);
    if (blocker.state === "blocked") {
      blocker.proceed();
    } else {
      nav(-1);
    }
  };

  const handleExitCancel = () => {
    setShowExitModal(false);
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  };

  return (
    <div className="space-y-12">
      <ToastContainer position="top-right" autoClose={3000} theme="light" />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 gap-8 text-center glass-panel bg-white/80 max-w-5xl mx-auto border-primary/20">

          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full animate-pulse" />
            <DotLottieReact
              src="https://lottie.host/c6e85f0e-ab1d-432f-9934-9685070ebbe5/lRV5Zqr8tM.lottie"
              loop
              autoplay
              className="w-32 h-32 relative"
            />
          </div>
          
          <div className="w-full max-w-4xl space-y-10 px-6">

            <div className="space-y-3">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Neural Processing Active</h2>
              <p className="text-slate-500 text-base">We are currently mapping sentiment vectors and extracting key highlights.</p>
            </div>

            {/* Enhanced Stepper */}
            <div className="relative py-4">
              <div className="absolute top-8 left-0 w-full h-1 bg-slate-100 rounded-full z-0" />
              <div 
                className="absolute top-8 left-0 h-1 bg-primary rounded-full transition-all duration-1000 z-10" 
                style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
              />
              
              <div className="relative z-20 flex justify-between items-start w-full">
                {STEPS.map((step, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-4 w-24">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg ${
                      idx < currentStep ? "bg-green-500 text-white scale-110" : 
                      idx === currentStep ? "bg-primary text-white animate-pulse scale-125 ring-4 ring-primary/20" : 
                      "bg-white text-slate-300 border-2 border-slate-100"
                    }`}>
                      {idx < currentStep ? <FiCheckCircle size={20} /> : <span className="font-black text-sm">{idx + 1}</span>}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest text-center leading-tight transition-colors ${
                      idx === currentStep ? "text-primary" : idx < currentStep ? "text-green-600" : "text-slate-400"
                    }`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Status Badge */}
            <div className="inline-flex items-center gap-3 bg-primary/5 border border-primary/10 px-6 py-3 rounded-2xl mx-auto">
               <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
               <p className="text-sm font-bold text-primary italic">
                 {logs[logs.length - 1] || "Initializing neural handshake..."}
               </p>
            </div>

            <div className="pt-4 space-y-4">
              <button 
                onClick={() => setShowRawLogs(!showRawLogs)}
                className="btn-secondary w-full py-4 flex items-center justify-center gap-3 group shadow-sm hover:shadow-md"
              >
                <FiFileText className="text-primary group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest">
                  {showRawLogs ? "Minimize Console" : "Inspect Detailed Logs"}
                </span>
                {showRawLogs ? <FiChevronUp /> : <FiChevronDown />} 
              </button>

              {showRawLogs && (
                /* Mac-style window */
                <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-200 animate-in slide-in-from-top-4 duration-500">
                  {/* Mac title bar */}
                  <div className="h-9 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2 shrink-0">
                    <div className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors cursor-pointer" />
                    <div className="w-3 h-3 rounded-full bg-amber-400 hover:bg-amber-500 transition-colors cursor-pointer" />
                    <div className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 transition-colors cursor-pointer" />
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <FiCpu size={9} /> Kernel Log Stream
                      </span>
                    </div>
                  </div>
                  {/* Log content */}
                  <div
                    ref={logContainerRef}
                    className="w-full bg-slate-950 p-5 h-96 overflow-y-auto text-left font-mono text-xs overscroll-contain"
                    style={{ scrollBehavior: "smooth" }}
                  >
                    {logs.map((log, i) => (
                      <div key={i} className="text-slate-300 mb-1.5 font-medium flex gap-3 leading-relaxed">
                        <span className="text-slate-600 shrink-0 select-none">[{String(i).padStart(3, "0")}]</span>
                        <span className={
                          log.startsWith("[SYSTEM]") ? "text-blue-400 font-bold" :
                          log.startsWith("[FFMPEG]") ? "text-green-400 font-semibold" :
                          log.startsWith("  >") ? "text-slate-500" :
                          "text-slate-300"
                        }>{log}</span>
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-8 text-[10px] text-red-500 font-black uppercase tracking-[0.2em] flex items-center gap-3 bg-red-50/50 px-8 py-3 rounded-full border border-red-100/50 animate-pulse">
             <FiAlertTriangle size={14} /> SESSION LOCK: DO NOT REFRESH OR NAVIGATE
          </div>
        </div>
      ) : (
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
                      />
                      <div className="flex flex-col items-center text-center gap-3">
                        {video ? (
                          <>
                            <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/20">
                              <FiCheckCircle size={20} />
                            </div>
                            <div>
                               <p className="text-sm font-bold text-slate-900 truncate max-w-[180px]">{video.name}</p>
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
                      />
                      <div className="flex flex-col items-center text-center gap-3">
                        {subtitle ? (
                          <>
                            <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/20">
                              <FiCheckCircle size={20} />
                            </div>
                            <div>
                               <p className="text-sm font-bold text-slate-900 truncate max-w-[180px]">{subtitle.name}</p>
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
                      onClick={() => setSelectedModel(m.key)}
                      className={`p-4 rounded-xl cursor-pointer border transition-all duration-300 relative group ${
                        selectedModel === m.key
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-slate-100 bg-white hover:border-slate-300"
                      }`}
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
                 disabled={!video || !subtitle}
                 className="btn-primary py-4 px-16 text-lg disabled:opacity-40 shadow-xl shadow-primary/20 w-full md:w-auto"
               >
                 Start Processing
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <FiAlertTriangle size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Abort Processing?</h3>
              <p className="text-sm text-slate-500">Leaving now will interrupt the neural analysis and result in data loss.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleExitCancel}
                className="btn-primary w-full py-3"
              >
                Keep Analyzing
              </button>
              <button 
                onClick={handleExitConfirm}
                className="text-sm font-bold text-red-500 uppercase tracking-widest hover:underline"
              >
                Stop & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
