import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { FiLogOut, FiUser, FiMenu, FiX } from "react-icons/fi";
import api from "./api";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/editor", label: "Editor" },
  { to: "/highlights", label: "Highlights" },
  { to: "/jobs", label: "Jobs" },
  { to: "/compare", label: "Analytics" },
];

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch { setUser(null); }
    } else {
      setUser(null);
    }
  }, [location]);

  const logout = async () => {
    try { await api.post("/logout"); } catch {}
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login", { state: "logout" });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* ── Navbar ── */}
      <header className="h-16 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50 px-6 md:px-12 lg:px-24 flex items-center justify-between transition-all">
        {/* Logo */}
        <div
          onClick={() => navigate("/")}
          className="text-xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer tracking-tight select-none flex items-center gap-2"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-[10px] font-black shadow-md shadow-primary/20">
            H
          </div>
          HighLighter
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "text-primary bg-primary/5"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs font-medium text-slate-600">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[9px] text-white font-bold">
                  {user.username?.[0]?.toUpperCase() || "U"}
                </div>
                {user.username}
              </div>
              <button
                onClick={logout}
                className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                title="Logout"
              >
                <FiLogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="btn-primary py-1.5 px-5 text-sm"
            >
              Sign In
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-slate-500 p-1.5"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-100">
          <nav className="flex flex-col p-6 gap-1">
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? "text-primary bg-primary/5"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* ── Main ── */}
      <main className="flex-1 bg-mesh py-10">
        <div className="container-main">{children}</div>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-slate-200/60 py-10">
        <div className="container-main">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Brand */}
            <div className="space-y-4">
              <span className="text-lg font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                HighLighter
              </span>
              <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                Open-source tool for analyzing video semantics and extracting highlights using NLP sentiment models and FFmpeg.
              </p>
            </div>
            {/* Platform links — only existing routes */}
            <div>
              <h4 className="font-bold text-slate-900 mb-4 text-xs uppercase tracking-widest">Platform</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li onClick={() => navigate("/editor")} className="hover:text-primary cursor-pointer transition-colors">Video Editor</li>
                <li onClick={() => navigate("/highlights")} className="hover:text-primary cursor-pointer transition-colors">Highlights</li>
                <li onClick={() => navigate("/jobs")} className="hover:text-primary cursor-pointer transition-colors">Job Tracker</li>
                <li onClick={() => navigate("/compare")} className="hover:text-primary cursor-pointer transition-colors">Model Analytics</li>
              </ul>
            </div>
            {/* Tech */}
            <div>
              <h4 className="font-bold text-slate-900 mb-4 text-xs uppercase tracking-widest">Built With</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>FastAPI + PostgreSQL</li>
                <li>Hugging Face Transformers</li>
                <li>FFmpeg</li>
                <li>React + Vite</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
            © {new Date().getFullYear()} HighLighter — Open-source video highlight extraction.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
