import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiUser, FiMail, FiLock, FiArrowLeft } from "react-icons/fi";

const Register = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cPassword, setCPassword] = useState("");

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      register();
    }
  };

  const register = () => {
    if (password !== cPassword) {
      toast.error("Passwords do not match");
      return;
    }
    api
      .post("/register", {
        username: username,
        email: email,
        password: password,
        role: 2,
      })
      .then((res) => {
        if (res.status === 201) {
          const token = res.data.access_token;
          localStorage.setItem("token", token);
          
          api.get("/me", {
            headers: { Authorization: `Bearer ${token}` }
          })
          .then((response) => {
            localStorage.setItem("user", JSON.stringify(response.data));
            navigate("/", { state: "register" });
          })
          .catch((err) => {
            console.log(err);
            navigate("/", { state: "register" });
          });
        }
      })
      .catch((err) => {
        console.log(err);
        toast.error(err.response.data?.detail || err.message);
      });
  };

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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Join HighLighter</h1>
          <p className="text-slate-500">Start your journey with elite AI tools</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              type="text"
              placeholder="Username"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyPress}
            />
          </div>
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
          <div className="relative">
            <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              onChange={(e) => setCPassword(e.target.value)}
              onKeyDown={handleKeyPress}
            />
          </div>

          <button
            onClick={register}
            className="w-full bg-gradient-to-r from-primary to-accent py-3 rounded-xl font-semibold text-white hover:opacity-90 shadow-lg shadow-primary/20 transition-all mt-4"
          >
            Create Account
          </button>

          <div className="text-center pt-2">
            <p className="text-sm text-slate-400">
              Already have an account?{" "}
              <button
                onClick={() => navigate("/login")}
                className="text-primary hover:text-accent font-medium transition-colors"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
