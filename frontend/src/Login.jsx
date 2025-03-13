import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "./api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
          navigate("/", { state: "login" });
          localStorage.setItem("token", res.data.access_token);
          api
            .get("/me", {
              headers: {
                Authorization: `Bearer ${res.data.access_token}`,
              },
            })
            .then((response) => {
              localStorage.setItem("user", JSON.stringify(response.data));
            })
            .catch((err) => {
              console.log(err);
            });
        }
      })
      .catch((err) => {
        console.log(err);
        toast.error(err.response.data?.detail || err.message);
      });
  };

  useEffect(() => {
    if (state === "logout") toast.success("Logged out successfully");
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-y-8">
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        draggable={true}
        pauseOnHover={false}
        theme="colored"
      />
      <button
        onClick={() => navigate("/")}
        className="fixed top-8 flex items-center gap-x-4 lg:top-16"
      >
        <div className="text-3xl text-main cursor-pointer">HighLighter</div>
      </button>
      <div className="flex flex-col items-center gap-y-2">
        <p className="text-3xl font-bold text-xgray lg:text-4xl">
          Login to your account
        </p>
        <p className="lg:text-md text-sm text-xgray">
          Unlock Your Journey - Sign In to Get Started!
        </p>
      </div>
      <div className="flex w-[360px] flex-col gap-y-8 lg:w-[400px]">
        <div className="flex flex-col gap-y-6">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-md border border-[#DED2D9] px-2 py-3 focus:border-transparent focus:outline-none focus:ring-1 focus:ring-main"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <div className="flex flex-col gap-y-2">
            <input
              type="password"
              placeholder="Password"
              className="w-full rounded-md border border-[#DED2D9] px-2 py-3 focus:border-transparent focus:outline-none focus:ring-1 focus:ring-main"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyPress}
            />
          </div>
        </div>
        <div>
          <button
            type="button"
            onClick={login}
            className="w-full rounded-md bg-main p-3 text-lg font-medium text-white transition-all duration-200"
          >
            Login
          </button>
          <div className="flex justify-between items-center mt-2">
            <div className="text-xlightgray font-light">Need an account?</div>
            <button
              onClick={() => navigate("/register")}
              className="text-main hover:underline"
            >
              Create One!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
