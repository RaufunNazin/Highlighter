import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area
} from "recharts";
import { FiActivity, FiCpu, FiTrendingUp, FiZap, FiTarget, FiShield, FiAlertCircle } from "react-icons/fi";
import { toast, ToastContainer } from "react-toastify";
import api from "./api";

const METRIC_CONFIGS = [
  { key: "analysis_time", label: "Inference Latency", color: "#2563eb", unit: "s" },
  { key: "model_load_time", label: "Cold Start Time", color: "#7c3aed", unit: "s" },
  { key: "avg_confidence", label: "Decision Confidence", color: "#059669", unit: "" },
  { key: "highlights_found", label: "Sensitivity", color: "#d97706", unit: "" },
];

const ModelComparison = () => {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get("/analytics", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setRuns(response.data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      toast.error("Could not load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  const getAggregates = () => {
    const models = {};
    runs.forEach(r => {
      if (!models[r.model_key]) {
        models[r.model_key] = { 
          name: r.model_key.toUpperCase(), 
          analysis_time: 0, 
          model_load_time: 0, 
          avg_confidence: 0, 
          highlights_found: 0, 
          count: 0 
        };
      }
      models[r.model_key].analysis_time += r.analysis_time || 0;
      models[r.model_key].model_load_time += r.model_load_time || 0;
      models[r.model_key].avg_confidence += r.avg_confidence || 0;
      models[r.model_key].highlights_found += r.highlights_found || 0;
      models[r.model_key].count += 1;
    });

    return Object.values(models).map(m => ({
      ...m,
      analysis_time: m.analysis_time / m.count,
      model_load_time: m.model_load_time / m.count,
      avg_confidence: m.avg_confidence / m.count,
      highlights_found: m.highlights_found / m.count
    }));
  };

  const aggregates = getAggregates();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-pulse">
        <FiActivity className="text-primary text-6xl mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Synchronizing Neural Data...</p>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-6">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
          <FiAlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">No Analytics Found</h2>
        <p className="text-slate-500">Run your first video analysis in the Editor to generate performance benchmarks.</p>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      <ToastContainer position="top-right" autoClose={3000} theme="light" />

      {/* Header */}
      <div className="space-y-2 border-b border-slate-200 pb-12">
        <div className="flex items-center gap-2 text-primary font-bold tracking-widest text-[10px] uppercase">
          <FiActivity /> System Telemetry
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Model Performance Analytics</h1>
        <p className="text-slate-500 max-w-2xl text-lg leading-relaxed">
          Aggregated technical metrics from all neural processing sessions. These benchmarks represent the factual performance of NLP architectures on your hardware.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: "Best Latency", value: `${Math.min(...aggregates.map(a => a.analysis_time)).toFixed(3)}s`, icon: <FiZap />, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Top Confidence", value: `${(Math.max(...aggregates.map(a => a.avg_confidence)) * 100).toFixed(1)}%`, icon: <FiShield />, color: "text-green-500", bg: "bg-green-50" },
          { label: "Highest Sensitivity", value: Math.max(...aggregates.map(a => a.highlights_found)).toFixed(1), icon: <FiTarget />, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Avg Load Time", value: `${(aggregates.reduce((a, b) => a + b.model_load_time, 0) / aggregates.length).toFixed(2)}s`, icon: <FiCpu />, color: "text-purple-500", bg: "bg-purple-50" },
        ].map((kpi, i) => (
          <div key={i} className="glass-panel p-8 space-y-4 hover:shadow-xl transition-all duration-300">
            <div className={`w-12 h-12 ${kpi.bg} ${kpi.color} rounded-2xl flex items-center justify-center text-xl`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {METRIC_CONFIGS.map((cfg) => (
          <div key={cfg.key} className="glass-panel p-10 space-y-8">
            <div className="flex justify-between items-start">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">{cfg.label}</h3>
              <span className="text-[10px] font-medium text-slate-400">MEAN VALUE ACROSS RUNS</span>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aggregates} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey={cfg.key} fill={cfg.color} radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* Trend Analysis */}
      <div className="glass-panel p-10 space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Historical Performance Trend</h3>
            <p className="text-xs text-slate-500">Inference speed consistency across the last 20 sessions.</p>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-3 h-3 rounded-full bg-primary"></span>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inference Latency (s)</span>
          </div>
        </div>
        
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={runs.slice(-20)} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="id" hide />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="analysis_time" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorPv)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ModelComparison;
