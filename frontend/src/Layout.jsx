import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { FiLogOut, FiUser, FiActivity, FiVideo, FiHome } from "react-icons/fi";

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, [location]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login", { state: "logout" });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Navbar */}
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-6 md:px-24 flex items-center justify-between">
        <div 
          onClick={() => navigate("/")}
          className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer tracking-tight"
        >
          HighLighter.ai
        </div>
        
        <div className="flex items-center gap-8">
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className={`text-sm font-medium transition-colors ${location.pathname === "/" ? "text-primary" : "text-slate-500 hover:text-slate-900"}`}>Home</Link>
            <Link to="/editor" className={`text-sm font-medium transition-colors ${location.pathname === "/editor" ? "text-primary" : "text-slate-500 hover:text-slate-900"}`}>Editor</Link>
            <Link to="/compare" className={`text-sm font-medium transition-colors ${location.pathname === "/compare" ? "text-primary" : "text-slate-500 hover:text-slate-900"}`}>Analytics</Link>
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4 border-l border-slate-200 pl-8">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-600">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <FiUser size={12} />
                  </div>
                  {user.username}
                </div>
                <button
                  onClick={logout}
                  className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                  title="Logout"
                >
                  <FiLogOut size={20} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="btn-primary py-2 text-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 bg-mesh py-12">
        <div className="container-main">
          {children}
        </div>
      </main>

      {/* Real Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="container-main">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2 space-y-6">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                HighLighter.ai
              </span>
              <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                HighLighter.ai is a tool for developers and content creators to analyze video semantics and extract high-value highlights using open-source Large Language Models.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-widest">Platform</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li onClick={() => navigate("/editor")} className="hover:text-primary cursor-pointer transition-colors">Video Editor</li>
                <li onClick={() => navigate("/compare")} className="hover:text-primary cursor-pointer transition-colors">Model Comparison</li>
                <li className="hover:text-primary cursor-pointer transition-colors">Documentation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-widest">Connect</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li className="hover:text-primary cursor-pointer transition-colors">GitHub Repository</li>
                <li className="hover:text-primary cursor-pointer transition-colors">Contact Support</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <p>© 2026 HighLighter AI. Built for the community.</p>
            <div className="flex gap-6">
              <span className="hover:text-primary cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-primary cursor-pointer transition-colors">Terms</span>
              <span className="hover:text-primary cursor-pointer transition-colors">Cookie Policy</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
