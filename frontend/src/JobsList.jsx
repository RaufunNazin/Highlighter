import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import { FiServer, FiActivity, FiCheckCircle, FiAlertTriangle, FiClock, FiVideo, FiTrash2 } from "react-icons/fi";

const JobsList = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await api.get("/jobs/");
      setJobs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, jobId) => {
    e.stopPropagation(); // prevent navigation
    if (!window.confirm("Are you sure you want to cancel and delete this job?")) return;
    try {
      await api.delete(`/jobs/${jobId}`);
      setJobs(jobs.filter(j => j.id !== jobId));
    } catch (err) {
      console.error("Failed to delete job", err);
      alert("Failed to delete job");
    }
  };


  if (loading) return <div className="flex justify-center py-20"><FiActivity className="animate-spin text-primary text-4xl" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center justify-center gap-3">
          <FiServer className="text-primary" /> Processing Queue
        </h1>
        <p className="text-slate-500">Monitor your background tasks and neural analysis jobs.</p>
      </div>

      <div className="glass-panel p-8 bg-white border-slate-100">
        {jobs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No processing jobs found.
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
              <div 
                key={job.id} 
                onClick={() => nav(`/jobs/${job.id}`)}
                className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 hover:border-primary/30 hover:shadow-lg cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    job.status === 'completed' ? 'bg-green-50 text-green-600' :
                    job.status === 'failed' ? 'bg-red-50 text-red-600' :
                    'bg-blue-50 text-blue-600 animate-pulse'
                  }`}>
                    {job.status === 'completed' ? <FiCheckCircle size={24} /> :
                     job.status === 'failed' ? <FiAlertTriangle size={24} /> :
                     <FiActivity size={24} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{job.model_key.toUpperCase()} Engine</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1"><FiVideo /> {job.video_filename?.split('_').pop() || "Unknown Asset"}</span>
                      <span className="flex items-center gap-1"><FiClock /> {new Date(job.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                    job.status === 'completed' ? 'text-green-600 bg-green-50' :
                    job.status === 'failed' ? 'text-red-600 bg-red-50' :
                    'text-blue-600 bg-blue-50'
                  }`}>
                    {job.status}
                  </span>
                  
                  <button 
                    onClick={(e) => handleDelete(e, job.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Cancel & Delete Job"
                  >
                    <FiTrash2 />
                  </button>
                  <span className="text-slate-300 group-hover:text-primary transition-colors">→</span>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsList;
