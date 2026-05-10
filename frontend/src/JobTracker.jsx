import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "./api";
import { FiActivity, FiCpu, FiCheckCircle, FiAlertTriangle, FiArrowLeft, FiServer, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";

const JobTracker = () => {
  const { jobId } = useParams();
  const nav = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const logEndRef = useRef(null);

  useEffect(() => {
    fetchJobStatus();
    
    // Poll every 3 seconds while pending or processing
    const interval = setInterval(() => {
      if (!job || job.status === "pending" || job.status === "processing") {
        fetchJobStatus();
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [jobId, job?.status]);

  const fetchJobStatus = async () => {
    try {
      const res = await api.get(`/jobs/${jobId}`);
      setJob(res.data);
      setLoading(false);
      
      if (res.data.status === "completed" && job?.status !== "completed") {
        toast.success("Analysis complete!");
        localStorage.setItem("lastVideo", res.data.video_filename);
        if (res.data.result && res.data.result.final_video_url) {
          localStorage.setItem("finalVideo", res.data.result.final_video_url);
        }
        setTimeout(() => nav("/highlights"), 2000);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load job status");
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to cancel and completely delete this job?")) return;
    try {
      await api.delete(`/jobs/${jobId}`);
      toast.success("Job completely cancelled and removed.");
      nav("/jobs");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete job");
    }
  };

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [job?.logs]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-pulse">
        <FiActivity className="text-primary text-6xl mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Connecting to Background Worker...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Job Not Found</h2>
        <button onClick={() => nav("/")} className="btn-primary px-8 py-3">Return to Editor</button>
      </div>
    );
  }

  const isComplete = job.status === "completed";
  const isFailed = job.status === "failed";

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="flex items-center justify-between border-b border-slate-200 pb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => nav("/editor")} className="p-3 bg-white hover:bg-slate-50 text-slate-500 rounded-xl border border-slate-200 transition-colors">
            <FiArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              <FiServer className="text-primary" /> Active Process Tracker
            </h1>
            <p className="text-slate-500 font-mono text-xs mt-1">JOB ID: {jobId}</p>
          </div>
        </div>
        <button 
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-colors border border-red-100"
        >
          <FiTrash2 size={18} /> Cancel & Delete
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="glass-panel p-8 space-y-6 bg-white col-span-1 border border-slate-100 h-fit">
          <h3 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Job Details</h3>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Status</p>
              <div className={`mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest ${
                isComplete ? "bg-green-50 text-green-600" : 
                isFailed ? "bg-red-50 text-red-600" : 
                "bg-blue-50 text-blue-600 animate-pulse"
              }`}>
                {isComplete ? <FiCheckCircle /> : isFailed ? <FiAlertTriangle /> : <FiActivity />}
                {job.status}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Target Model</p>
              <p className="text-sm font-semibold text-slate-700 mt-1">{job.model_key.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Source Asset</p>
              <p className="text-sm font-semibold text-slate-700 mt-1 truncate" title={job.video_filename}>
                {job.video_filename?.split('_').pop() || "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Started At</p>
              <p className="text-sm font-semibold text-slate-700 mt-1">
                {new Date(job.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 space-y-4">
          <h3 className="font-bold text-slate-900 uppercase tracking-widest text-xs flex items-center gap-2">
            <FiCpu className="text-primary" /> Live Worker Logs
          </h3>
          <div className="w-full bg-slate-950 rounded-2xl p-6 h-[400px] overflow-y-auto text-left font-mono text-xs shadow-2xl border border-slate-800">
            {job.logs.length === 0 ? (
              <p className="text-slate-600 italic">Waiting for worker allocation...</p>
            ) : (
              job.logs.map((log, i) => (
                <div key={i} className="text-slate-300 mb-2 font-medium flex gap-3 leading-relaxed">
                  <span className="text-slate-600 shrink-0 select-none">[{String(i).padStart(3, "0")}]</span>
                  <span className={
                    log.includes("Error") ? "text-red-400 font-bold" :
                    log.startsWith("Initializing") ? "text-blue-400 font-bold" :
                    log.includes("complete") ? "text-green-400 font-semibold" :
                    "text-slate-300"
                  }>{log}</span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
          
          {isFailed && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-600 flex items-start gap-3">
              <FiAlertTriangle size={20} className="shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Process Failed</h4>
                <p className="text-xs mt-1">{job.error_message}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobTracker;
