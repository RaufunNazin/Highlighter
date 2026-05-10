import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "./api";
import { 
  FiVideo, 
  FiDownload, 
  FiChevronDown, 
  FiChevronUp, 
  FiClock, 
  FiFileText, 
  FiExternalLink,
  FiPlay,
  FiActivity
} from "react-icons/fi";

const Highlights = () => {
  const nav = useNavigate();
  const location = useLocation();
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const baseURL = api.defaults.baseURL.replace(/\/$/, "");

  useEffect(() => {
    fetchExports();
  }, []);

  const fetchExports = async () => {
    setLoading(true);
    try {
      const response = await api.get("/my-runs");
      // Filter for items that actually have an outputVideo
      const filtered = response.data.filter(run => run.outputVideo);
      setExports(filtered);
      
      // Auto-expand the most recent one if we just came from a job
      const finalVideoFromJob = localStorage.getItem("finalVideo");
      if (finalVideoFromJob) {
        const matchingExport = filtered.find(e => e.outputVideo === finalVideoFromJob);
        if (matchingExport) {
          setExpandedId(matchingExport.id);
          // Clear it so it doesn't auto-expand next time we visit
          localStorage.removeItem("finalVideo");
        }
      }
    } catch (error) {
      console.error("Error fetching exports:", error);
      toast.error("Failed to fetch export history.");
    } finally {
      setLoading(false);
    }
  };

  const getSequentialName = (exp, allExports) => {
    // Filter all exports for the same source video
    const sameSourceExports = allExports
      .filter(e => e.inputVideo === exp.inputVideo)
      .sort((a, b) => a.id - b.id); // Sort by ID ascending (oldest first)
    
    // Find the index of the current export in that list
    const index = sameSourceExports.findIndex(e => e.id === exp.id);
    const versionNumber = String(index + 1).padStart(2, '0');
    
    // Extract original name (UUID_original_name.mp4 -> original_name.mp4)
    const originalName = exp.inputVideo.split('_').slice(1).join('_') || exp.inputVideo;
    
    return `H${versionNumber}_${originalName}`;
  };

  const toggleAccordion = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-12">
      <ToastContainer position="top-right" autoClose={3000} theme="light" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-200 pb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold tracking-widest text-[10px] uppercase">
             <FiVideo /> Asset Management
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Final Exports</h1>
          <p className="text-slate-500">View, preview, and download your processed highlight reels.</p>
        </div>
        <button 
          onClick={() => nav("/editor")}
          className="btn-primary py-3 px-8 flex items-center gap-2"
        >
          New Project <FiPlay />
        </button>
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center space-y-4">
          <FiActivity className="text-primary text-4xl animate-spin" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Exports...</p>
        </div>
      ) : exports.length === 0 ? (
        <div className="py-32 text-center glass-panel bg-white/50 border-dashed border-slate-200">
           <FiVideo className="mx-auto text-slate-200 mb-4" size={48} />
           <h3 className="text-xl font-bold text-slate-900">No Exports Yet</h3>
           <p className="text-slate-500 mt-2">Finish a processing job to see your highlights here.</p>
           <button onClick={() => nav("/editor")} className="btn-glass mt-6">Go to Editor</button>
        </div>
      ) : (
        <div className="space-y-4">
          {exports.map((exp) => {
            const isExpanded = expandedId === exp.id;
            const displayName = getSequentialName(exp, exports);
            
            return (
              <div key={exp.id} className={`glass-panel overflow-hidden transition-all duration-300 ${isExpanded ? "ring-2 ring-primary bg-white shadow-2xl" : "bg-white/50 hover:bg-white"}`}>
                {/* Accordion Header */}
                <div 
                  className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer"
                  onClick={() => toggleAccordion(exp.id)}
                >
                  <div className="flex items-center gap-5 w-full md:w-auto">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isExpanded ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-100 text-slate-400"}`}>
                      <FiVideo size={20} />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-slate-900 truncate pr-4" title={displayName}>{displayName}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <FiClock size={12} /> {exp.time ? `${parseFloat(exp.time).toFixed(1)}s` : "Unknown"}
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <FiFileText size={12} /> {exp.model_key.toUpperCase()} ENGINE
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <a 
                      href={`${baseURL}/static/${exp.outputVideo}`}
                      download={displayName}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-600 font-bold text-xs rounded-xl transition-colors border border-green-100"
                    >
                      <FiDownload /> Export
                    </a>
                    <div className="w-8 h-8 flex items-center justify-center text-slate-400">
                      {isExpanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="h-px bg-slate-100 mb-6" />
                    <div className="relative group rounded-2xl overflow-hidden bg-slate-900 aspect-video shadow-2xl">
                      <video 
                        src={`${baseURL}/static/${exp.outputVideo}`}
                        controls
                        className="w-full h-full"
                        autoPlay={expandedId === exp.id && localStorage.getItem("finalVideo") === exp.outputVideo}
                      />
                    </div>
                    <div className="mt-6 flex flex-wrap gap-4 items-center justify-between">
                       <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Source Reference</p>
                          <p className="text-xs font-medium text-slate-600 truncate max-w-md">{exp.inputVideo}</p>
                       </div>
                       <div className="flex gap-3">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              nav("/compare");
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-primary font-bold text-xs transition-colors"
                          >
                            <FiExternalLink /> View Metrics
                          </button>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Highlights;
