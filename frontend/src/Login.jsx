import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "./api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiMail, FiLock, FiArrowLeft } from "react-icons/fi";

const Login = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      login();
    }
  };

  const login = () => {
    api
      .post("/login", {
        username: email,
        password: password,
      })
      .then((res) => {
        if (res.status === 200) {
          // Cookie is set automatically by the server (httpOnly)
          // Just fetch user profile to store display info
          api.get("/me")
            .then((response) => {
              localStorage.setItem("user", JSON.stringify(response.data));
              const from = state?.from || "/";
              navigate(from, { state: "login" });
            })
            .catch((err) => {
              console.log(err);
              const from = state?.from || "/";
              navigate(from, { state: "login" });
            });
        }
      })
      .catch((err) => {
        console.log(err);
        toast.error(err.response?.data?.detail || err.message);
      });
  };

  useEffect(() => {
    if (state === "logout") toast.success("Logged out successfully");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-mesh p-6">
      <ToastContainer position="top-right" autoClose={2000} theme="light" />
      
      <button
        onClick={() => navigate("/")}
        className="fixed top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors"
      >
        <FiArrowLeft /> Back to Home
      </button>

      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-8 md:p-10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
        
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
          <p className="text-slate-500">Continue your AI-powered journey</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyPress}
              />
            </div>
            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="password"
                placeholder="Password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyPress}
              />
            </div>
          </div>

          <button
            onClick={login}
            className="w-full bg-gradient-to-r from-primary to-accent py-3 rounded-xl font-semibold text-white hover:opacity-90 shadow-lg shadow-primary/20 transition-all"
          >
            Sign In
          </button>

          <div className="text-center">
            <p className="text-sm text-slate-400">
              Don't have an account?{" "}
              <button
                onClick={() => navigate("/register")}
                className="text-primary hover:text-accent font-medium transition-colors"
              >
                Create One
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
