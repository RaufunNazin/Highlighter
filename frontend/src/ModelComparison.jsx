import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, ScatterChart, Scatter, ReferenceLine, Label
} from "recharts";
import { FiActivity, FiCpu, FiZap, FiTarget, FiShield, FiAlertCircle, FiVideo, FiClock, FiCheckCircle, FiStar, FiCalendar } from "react-icons/fi";
import { toast, ToastContainer } from "react-toastify";
import api from "./api";

const METRIC_CONFIGS = [
  { key: "analysis_time", label: "Inference Latency", color: "#2563eb", unit: "s" },
  { key: "model_load_time", label: "Cold Start Time", color: "#7c3aed", unit: "s" },
  { key: "avg_confidence", label: "Decision Confidence", color: "#059669", unit: "%", multiplier: 100 },
  { key: "highlights_found", label: "Highlight Clip Count", color: "#d97706", unit: "" },
];

const ModelComparison = () => {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get("/my-runs", {
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
          count: 0,
          load_count: 0
        };
      }
      models[r.model_key].analysis_time += r.analysis_time || 0;
      
      // Filter out outliers (> 60s) for cold start average
      if (r.model_load_time && r.model_load_time <= 60) {
        models[r.model_key].model_load_time += r.model_load_time;
        models[r.model_key].load_count += 1;
      }
      
      models[r.model_key].avg_confidence += r.avg_confidence || 0;
      models[r.model_key].highlights_found += r.highlights_found || 0;
      models[r.model_key].count += 1;
    });

    return Object.values(models).map(m => {
      const avg_analysis = m.analysis_time / m.count;
      const avg_load = m.load_count > 0 ? m.model_load_time / m.load_count : 0;
      const avg_conf = m.avg_confidence / m.count;
      const avg_highlights = m.highlights_found / m.count;
      
      // Calculate a heuristic efficiency score: (Confidence * Clips) / (Latency * LoadTime)
      // We normalize LoadTime to at least 1s to avoid div by zero/infinity bias
      const score = (avg_conf * avg_highlights) / (avg_analysis * Math.max(avg_load, 1));

      return {
        ...m,
        analysis_time: avg_analysis,
        model_load_time: avg_load,
        avg_confidence: avg_conf,
        highlights_found: avg_highlights,
        score
      };
    });
  };

  const aggregates = getAggregates();

  const getBest = (key, minimize = false) => {
    if (aggregates.length === 0) return { name: "N/A", value: 0 };
    return aggregates.reduce((best, current) => {
      if (minimize) return current[key] < best[key] ? current : best;
      return current[key] > best[key] ? current : best;
    }, aggregates[0]);
  };

  const bestLatency = getBest("analysis_time", true);
  const bestConfidence = getBest("avg_confidence", false);
  const bestSensitivity = getBest("highlights_found", false);
  const bestLoadTime = getBest("model_load_time", true);
  const bestOverall = getBest("score", false);

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

  const CustomTooltip = ({ active, payload, label, config }) => {
    if (active && payload && payload.length) {
      const val = config.multiplier ? payload[0].value * config.multiplier : payload[0].value;
      return (
        <div className="bg-white p-3 rounded-lg shadow-2xl border border-slate-100 text-xs font-sans ring-1 ring-black/5">
          <p className="font-black text-slate-900 mb-1 uppercase tracking-tighter">{label}</p>
          <div className="h-px bg-slate-100 my-2" />
          <p className="text-primary font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {config.label}: {val.toFixed(2)}{config.unit}
          </p>
        </div>
      );
    }
    return null;
  };

  const ScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-xl shadow-2xl border border-slate-100 text-xs font-sans ring-1 ring-black/5 min-w-[150px]">
          <p className="font-black text-slate-900 mb-1 uppercase tracking-widest text-[10px]">{data.name}</p>
          <div className="h-px bg-slate-100 my-2" />
          <div className="space-y-1.5">
            <p className="flex justify-between text-slate-500"><span>Latency:</span> <span className="font-bold text-blue-600">{data.analysis_time.toFixed(2)}s</span></p>
            <p className="flex justify-between text-slate-500"><span>Confidence:</span> <span className="font-bold text-green-600">{(data.avg_confidence * 100).toFixed(1)}%</span></p>
            <p className="flex justify-between text-slate-500"><span>Efficiency:</span> <span className="font-bold text-purple-600">{data.score.toFixed(2)}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  const baseURL = api.defaults.baseURL.replace(/\/$/, "");

  return (
    <div className="space-y-16">

      <ToastContainer position="top-right" autoClose={3000} theme="light" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-8 border-b border-slate-200 pb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold tracking-widest text-[10px] uppercase">
            <FiActivity /> System Telemetry
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Neural Benchmarks</h1>
          <p className="text-slate-500 max-w-2xl text-lg leading-relaxed">
            Real-time performance metrics filtered for accuracy (outliers removed).
          </p>
        </div>
        
        {/* Overall Best Badge */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-2xl relative overflow-hidden group transition-transform hover:scale-105">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/20 blur-3xl rounded-full group-hover:bg-primary/40 transition-colors" />
           <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary text-2xl border border-primary/30">
                <FiStar className="fill-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Overall Champion</p>
                <h4 className="text-xl font-black tracking-tight">{bestOverall.name}</h4>
              </div>
           </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: "Fastest Latency", value: `${bestLatency.analysis_time.toFixed(3)}s`, model: bestLatency.name, icon: <FiZap />, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Max Confidence", value: `${(bestConfidence.avg_confidence * 100).toFixed(1)}%`, model: bestConfidence.name, icon: <FiShield />, color: "text-green-500", bg: "bg-green-50" },
          { label: "Top Clip Count", value: bestSensitivity.highlights_found.toFixed(1), model: bestSensitivity.name, icon: <FiTarget />, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Best Cold Start", value: `${bestLoadTime.model_load_time.toFixed(3)}s`, model: bestLoadTime.name, icon: <FiCpu />, color: "text-purple-500", bg: "bg-purple-50" },
        ].map((kpi, i) => (
          <div key={i} className="glass-panel p-8 space-y-4 hover:shadow-xl transition-all duration-300 border-slate-100/50">
            <div className={`w-12 h-12 ${kpi.bg} ${kpi.color} rounded-2xl flex items-center justify-center text-xl shadow-inner`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
              <div className="flex items-baseline gap-2 mt-1">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</h3>
                 <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${kpi.bg} ${kpi.color} border border-current/10 uppercase`}>
                   {kpi.model}
                 </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Efficiency Matrix */}
      <div className="glass-panel p-10 space-y-8 bg-white shadow-2xl border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
               Efficiency Matrix <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[9px] rounded uppercase">Cross-Model Correlation</span>
            </h3>
            <p className="text-xs text-slate-400">Comparing inference speed against decision quality.</p>
          </div>
          <div className="flex gap-4">
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> Model Data Point
             </div>
          </div>
        </div>
        
        <div className="h-[400px] w-full bg-slate-50/30 rounded-3xl p-4 border border-slate-50">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 40, right: 40, bottom: 40, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                type="number" 
                dataKey="analysis_time" 
                name="Latency" 
                unit="s" 
                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} 
                domain={['auto', 'auto']} 
                reversed 
                axisLine={false}
                tickLine={false}
              >
                <Label value="FASTER (SEC) ←" offset={-20} position="insideBottom" style={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em' }} />
              </XAxis>
              <YAxis 
                type="number" 
                dataKey="avg_confidence" 
                name="Confidence" 
                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} 
                domain={[0, 1]} 
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
              >
                <Label value="CONFIDENCE (%) ↑" angle={-90} position="insideLeft" style={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em' }} />
              </YAxis>
              
              {/* Quadrant Lines */}
              <ReferenceLine x={aggregates.reduce((a,b) => a+b.analysis_time, 0)/aggregates.length} stroke="#e2e8f0" strokeDasharray="5 5" />
              <ReferenceLine y={aggregates.reduce((a,b) => a+b.avg_confidence, 0)/aggregates.length} stroke="#e2e8f0" strokeDasharray="5 5" />

              <RechartsTooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter 
                name="Models" 
                data={aggregates} 
                fill="#7c3aed" 
                line={false} 
                shape={(props) => {
                  const { cx, cy, payload } = props;
                  const isBest = payload.name === bestOverall.name;
                  return (
                    <g>
                      {isBest && <circle cx={cx} cy={cy} r={12} fill="#7c3aed" fillOpacity={0.1} />}
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r={isBest ? 6 : 4} 
                        fill={isBest ? "#7c3aed" : "#94a3b8"} 
                        stroke="white" 
                        strokeWidth={2}
                        className="transition-all duration-500"
                      />
                      <text x={cx} y={cy - 12} textAnchor="middle" style={{ fontSize: 9, fontWeight: 800, fill: isBest ? '#7c3aed' : '#94a3b8', textTransform: 'uppercase' }}>{payload.name}</text>
                    </g>
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
           <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
              <h5 className="text-[10px] font-black text-green-700 uppercase mb-1">Top-Right Quadrant</h5>
              <p className="text-xs text-green-600/80 leading-relaxed">High Confidence / Low Latency. These models are ideal for production use where both speed and precision matter.</p>
           </div>
           <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <h5 className="text-[10px] font-black text-blue-700 uppercase mb-1">Efficiency Score</h5>
              <p className="text-xs text-blue-600/80 leading-relaxed">The <span className="font-bold">Overall Champion</span> is selected based on a balanced weighted score of latency, confidence, and detection volume.</p>
           </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {METRIC_CONFIGS.map((cfg) => (
          <div key={cfg.key} className="glass-panel p-10 space-y-8 bg-white border-slate-100">
            <div className="flex justify-between items-start">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">{cfg.label}</h3>
              <span className="text-[10px] font-bold text-slate-300 uppercase">Mean Benchmark</span>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aggregates} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} 
                         tickFormatter={(val) => cfg.multiplier ? `${(val * cfg.multiplier).toFixed(0)}%` : val.toFixed(1)} />
                  <RechartsTooltip content={<CustomTooltip config={cfg} />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey={cfg.key} fill={cfg.color} radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* Historical Runs Log */}
      <div className="glass-panel p-10 space-y-8 bg-white border-slate-100">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Processing History</h3>
            <p className="text-[10px] text-slate-400">Individual run logs with full technical telemetry.</p>
          </div>
          <FiCalendar className="text-slate-200 text-2xl" />
        </div>
        
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm text-slate-500">
            <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 tracking-widest font-black">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Source Video</th>
                <th className="px-6 py-4">Engine</th>
                <th className="px-6 py-4">Latency</th>
                <th className="px-6 py-4">Clips</th>
                <th className="px-6 py-4 text-right rounded-tr-2xl">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5 font-mono text-[10px] text-slate-300">#{run.id}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <FiVideo size={14} />
                      </div>
                      <div className="max-w-[200px]">
                         <p className="font-bold text-slate-700 truncate text-xs" title={run.inputVideo}>{run.inputVideo.split('_').pop()}</p>
                         <p className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">Processed Asset</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-md uppercase border border-slate-200/50 group-hover:border-primary/20 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                      {run.model_key}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                       <span className="font-bold text-slate-700 text-xs">{(run.analysis_time || 0).toFixed(2)}s</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span className="font-bold text-slate-700 text-xs">{run.highlights_found || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    {run.outputVideo ? (
                      <a 
                        href={`${baseURL}/static/${run.outputVideo}`}
                        download
                        className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full border border-green-100 hover:bg-green-100 transition-colors"
                      >
                        <FiCheckCircle size={10} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Download</span>
                      </a>
                    ) : (
                      <span className="text-slate-300 text-[9px] font-bold uppercase tracking-widest px-3 py-1 bg-slate-50 rounded-full border border-slate-100" title="Only individual segments were extracted">
                        Partial
                      </span>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ModelComparison;
