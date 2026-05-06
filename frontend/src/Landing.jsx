import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiZap, FiTarget, FiArrowRight, FiCpu } from "react-icons/fi";

const Landing = () => {
  const nav = useNavigate();
  const { state } = useLocation();

  useEffect(() => {
    if (state === "login") {
      toast.success("Logged in successfully");
    }
  }, [state]);

  return (
    <div className="space-y-32">
      <ToastContainer position="top-right" autoClose={2000} theme="light" />
      
      {/* Hero Section */}
      <section className="flex flex-col lg:flex-row items-center justify-between gap-16 py-12">
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight text-slate-900">
              Open-Source <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">AI Video</span> Highlighting
            </h1>
            <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Analyze video content through NLP processing. HighLighter allows you to select from multiple open-source sentiment models to find the most exciting moments in your footage.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <button
              onClick={() => nav("/editor")}
              className="btn-primary py-4 px-10 flex items-center justify-center gap-3 group text-lg"
            >
              Get Started <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => nav("/compare")}
              className="btn-glass py-4 px-10 text-lg border-slate-200"
            >
              View Analytics
            </button>
          </div>
        </div>

        <div className="flex-1 w-full max-w-2xl relative perspective-1000 hidden lg:block">
          <div className="absolute inset-0 bg-primary/10 blur-[120px] rounded-full" />
          
          {/* Tilted Mac Window */}
          <div 
            className="relative transition-transform duration-700 ease-out hover:rotate-0"
            style={{ 
              transform: "rotateY(-15deg) rotateX(5deg) scale(1.05)",
              transformStyle: "preserve-3d"
            }}
          >
            <div className="glass-panel overflow-hidden border-white/40 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] bg-white/20 backdrop-blur-2xl">
              {/* Mac Header */}
              <div className="h-8 bg-white/30 border-b border-white/20 flex items-center px-4 gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/80"></div>
                <div className="flex-1"></div>
                <div className="w-16 h-1.5 rounded-full bg-white/20"></div>
              </div>
              {/* Content */}
              <div className="p-1">
                <img 
                  src="/image.png" 
                  alt="HighLighter Dashboard Preview" 
                  className="w-full h-auto rounded-lg shadow-inner"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile View Hero Image (Non-tilted) */}
        <div className="lg:hidden w-full max-w-md mx-auto relative">
           <div className="glass-panel overflow-hidden border-white/40 shadow-2xl bg-white/20">
              <div className="h-6 bg-white/30 border-b border-white/20 flex items-center px-3 gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400/80"></div>
                <div className="w-2 h-2 rounded-full bg-amber-400/80"></div>
                <div className="w-2 h-2 rounded-full bg-green-400/80"></div>
              </div>
              <img src="/image.png" alt="Preview" className="w-full h-auto" />
           </div>
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-16">
        <div className="text-center space-y-4">
           <h2 className="text-3xl font-bold text-slate-900">Core Workflow</h2>
           <p className="text-slate-500 max-w-xl mx-auto italic">Process local videos using state-of-the-art sentiment analysis models.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              title: "Sentiment Mapping", 
              desc: "The system reads your subtitle files and maps sentiment scores to specific video timestamps.", 
              icon: <FiZap className="text-primary" /> 
            },
            { 
              title: "Model Versatility", 
              desc: "Choose between BERT, DistilBERT, or RoBERTa to find the best accuracy/speed balance for your hardware.", 
              icon: <FiCpu className="text-accent" /> 
            },
            { 
              title: "Direct Concatenation", 
              desc: "Once you select your favorite clips, FFmpeg handles the heavy lifting of merging them into a final highlight reel.", 
              icon: <FiTarget className="text-green-500" /> 
            }
          ].map((feature, i) => (
            <div key={i} className="glass-panel p-10 space-y-6 hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 border-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-3xl border border-slate-100">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Technical Truth Section */}
      <section className="glass-panel p-12 md:p-20 bg-slate-900 text-white relative overflow-hidden">
         <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[150px] rounded-full"></div>
         <div className="max-w-3xl space-y-8 relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Transparency in Processing</h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              HighLighter is built on top of the <span className="text-white font-semibold">Hugging Face Transformers</span> library and <span className="text-white font-semibold">FFmpeg</span>. We provide transparent analytics for every model run so you can monitor load times, inference latency, and detection confidence directly in your dashboard.
            </p>
            <div className="flex gap-12 pt-4">
               <div>
                  <div className="text-3xl font-black text-primary">SQLite</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Data Persistence</div>
               </div>
               <div>
                  <div className="text-3xl font-black text-accent">React 19</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Frontend Stack</div>
               </div>
               <div>
                  <div className="text-3xl font-black text-white">FastAPI</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Core API Engine</div>
               </div>
            </div>
         </div>
      </section>
    </div>
  );
};

export default Landing;
