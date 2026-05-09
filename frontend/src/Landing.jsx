import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiZap, FiTarget, FiArrowRight, FiCpu, FiLayers, FiSliders, FiClock, FiCheck } from "react-icons/fi";

const Landing = () => {
  const nav = useNavigate();
  const { state } = useLocation();

  useEffect(() => {
    if (state === "login") {
      toast.success("Logged in successfully");
    }
  }, [state]);

  return (
    <div className="space-y-24">
      <ToastContainer position="top-right" autoClose={2000} theme="light" />

      {/* ═══════════ Hero ═══════════ */}
      <section className="flex flex-col lg:flex-row items-center justify-between gap-16 py-8">
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 border border-primary/10 rounded-full text-xs font-bold text-primary uppercase tracking-wider">
              <FiZap size={12} /> Open-Source NLP Pipeline
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-slate-900">
              Intelligent Video
              <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Highlight Extraction
              </span>
            </h1>
            <p className="text-base md:text-lg text-slate-500 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Upload a video and its SRT subtitles. HighLighter runs sentiment analysis on every subtitle line using your choice of Hugging Face transformer model, identifies the most exciting moments, and lets you visually approve cuts on an interactive timeline before rendering.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <button
              onClick={() => nav("/editor")}
              className="btn-primary py-3.5 px-8 flex items-center justify-center gap-2 group"
            >
              Open Editor <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => nav("/compare")}
              className="btn-glass py-3.5 px-8 border-slate-200"
            >
              Model Analytics
            </button>
          </div>
        </div>

        {/* Hero visual */}
        <div className="flex-1 w-full max-w-2xl relative perspective-1000 hidden lg:block">
          <div className="absolute inset-0 bg-primary/8 blur-[100px] rounded-full" />
          <div
            className="relative transition-transform duration-700 ease-out hover:rotate-0"
            style={{ transform: "rotateY(-12deg) rotateX(4deg) scale(1.02)", transformStyle: "preserve-3d" }}
          >
            <div className="glass-panel overflow-hidden border-white/40 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] bg-white/25 backdrop-blur-2xl">
              <div className="h-7 bg-white/30 border-b border-white/20 flex items-center px-3 gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-400/80" />
                <div className="w-2 h-2 rounded-full bg-amber-400/80" />
                <div className="w-2 h-2 rounded-full bg-green-400/80" />
              </div>
              <div className="p-1">
                <img src="/image.png" alt="HighLighter Editor Preview" className="w-full h-auto rounded-lg shadow-inner" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile hero image */}
        <div className="lg:hidden w-full max-w-md mx-auto relative">
          <div className="glass-panel overflow-hidden border-white/40 shadow-xl bg-white/20">
            <div className="h-6 bg-white/30 border-b border-white/20 flex items-center px-3 gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400/80" />
              <div className="w-2 h-2 rounded-full bg-amber-400/80" />
              <div className="w-2 h-2 rounded-full bg-green-400/80" />
            </div>
            <img src="/image.png" alt="Preview" className="w-full h-auto" />
          </div>
        </div>
      </section>

      {/* ═══════════ How It Works ═══════════ */}
      <section className="space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">How It Works</h2>
          <p className="text-slate-500 max-w-lg mx-auto text-sm">Three stages, fully transparent. No black-box processing.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Upload & Analyze",
              desc: "Upload your video and SRT subtitle file. The system parses every subtitle line and runs sentiment analysis using your selected transformer model.",
              icon: <FiCpu className="text-primary" />,
            },
            {
              step: "02",
              title: "Review on Timeline",
              desc: "AI-detected highlights appear as green segments on an interactive timeline. Drag handles to resize, click to add or remove segments, and zoom in for precision.",
              icon: <FiSliders className="text-accent" />,
            },
            {
              step: "03",
              title: "Export Highlight Reel",
              desc: "Once you're satisfied, hit Export. A single FFmpeg filter-complex pass concatenates all approved segments into one MP4 — no intermediate clips needed.",
              icon: <FiTarget className="text-green-500" />,
            },
          ].map((item) => (
            <div key={item.step} className="glass-panel p-8 space-y-4 hover:shadow-lg hover:translate-y-[-2px] transition-all duration-300 border-slate-100 relative">
              <div className="absolute top-6 right-6 text-[40px] font-black text-slate-100 leading-none select-none">{item.step}</div>
              <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl border border-slate-100">
                {item.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="text-slate-500 leading-relaxed text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ Models ═══════════ */}
      <section className="space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Supported Models</h2>
          <p className="text-slate-500 max-w-lg mx-auto text-sm">
            All models are open-source, from Hugging Face. Pick the one that fits your speed/accuracy tradeoff.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: "BERT Multilingual", id: "nlptown/bert-base-multilingual-uncased-sentiment", trait: "Best multilingual accuracy" },
            { name: "DistilBERT", id: "distilbert-base-uncased-finetuned-sst-2-english", trait: "40% faster, similar accuracy" },
            { name: "ALBERT", id: "textattack/albert-base-v2-SST-2", trait: "Low memory footprint" },
            { name: "RoBERTa", id: "cardiffnlp/twitter-roberta-base-sentiment-latest", trait: "Strong English sentiment" },
          ].map((m) => (
            <div key={m.name} className="glass-panel p-6 space-y-3 border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm">{m.name}</h4>
              <p className="text-[11px] text-slate-400 font-mono break-all leading-relaxed">{m.id}</p>
              <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
                <FiCheck size={12} /> {m.trait}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ Feature Details ═══════════ */}
      <section className="space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">What You Get</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              icon: <FiSliders className="text-primary" />,
              title: "Interactive Timeline Editor",
              desc: "A full-width zoomable timeline with drag handles, playhead sync, and minimap. Review every second before committing to a render.",
            },
            {
              icon: <FiLayers className="text-accent" />,
              title: "Audio Waveform Display",
              desc: "WaveSurfer.js renders the audio waveform directly in the timeline, so you can visually identify speech vs silence while editing.",
            },
            {
              icon: <FiClock className="text-green-500" />,
              title: "Fast Analysis, Lazy Render",
              desc: "Subtitle analysis completes in seconds. FFmpeg only runs once — after you approve your cuts — eliminating wasted processing time.",
            },
            {
              icon: <FiZap className="text-amber-500" />,
              title: "Transparent Metrics",
              desc: "Every analysis run reports model load time, inference duration, subtitle count, highlight count, and average confidence score.",
            },
          ].map((f, i) => (
            <div key={i} className="glass-panel p-8 flex gap-5 items-start border-slate-100 hover:shadow-lg transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-lg border border-slate-100 shrink-0">
                {f.icon}
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ Tech Stack Banner ═══════════ */}
      <section className="glass-panel p-10 md:p-16 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/15 blur-[120px] rounded-full" />
        <div className="max-w-3xl space-y-6 relative z-10">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight">Under the Hood</h2>
          <p className="text-slate-400 leading-relaxed">
            HighLighter is built on <span className="text-white font-semibold">Hugging Face Transformers</span> for NLP inference
            and <span className="text-white font-semibold">FFmpeg</span> for video processing.
            The backend is <span className="text-white font-semibold">FastAPI</span> with <span className="text-white font-semibold">PostgreSQL</span> persistence
            and <span className="text-white font-semibold">Celery + Redis</span> for async job processing.
            The frontend is <span className="text-white font-semibold">React</span> with <span className="text-white font-semibold">Vite</span> and Tailwind CSS.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {["FastAPI", "PostgreSQL", "Celery", "Redis", "React", "Vite", "Tailwind", "FFmpeg", "WaveSurfer.js"].map((t) => (
              <span key={t} className="px-3 py-1 bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-slate-300">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="text-center space-y-6 py-4">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Ready to extract highlights?</h2>
        <p className="text-slate-500 max-w-md mx-auto text-sm">Upload your video and subtitle file to get started. The analysis is fast — you'll be on the timeline editor in seconds.</p>
        <button
          onClick={() => nav("/editor")}
          className="btn-primary py-3.5 px-10 inline-flex items-center gap-2 group text-lg shadow-xl shadow-primary/20"
        >
          Get Started <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
        </button>
      </section>
    </div>
  );
};

export default Landing;
