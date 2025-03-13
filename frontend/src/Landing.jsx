import React, { useEffect } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useNavigate, useLocation } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Landing = () => {
  const nav = useNavigate();
  const { state } = useLocation();

  useEffect(() => {
    if (state === "login") {
      toast.success("Logged in successfully");
    }
  }, [state]);

  return (
    <div className="h-screen flex flex-col">
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
      {/* Navbar */}
      <div className="flex justify-start md:justify-center w-full py-5 pl-10 md:pl-0">
        <div className="text-3xl text-main cursor-pointer">HighLighter</div>
        <div className="flex justify-center items-center gap-10 fixed top-6 right-10">
          {localStorage.getItem("token") ? (
            <div className="flex items-center gap-5">
              {JSON.parse(localStorage.getItem("user"))?.username || "User"}
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  nav("/login", { state: "logout" });
                }}
                className="text-lg text-red-700 cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => nav("/login")}
              className="text-lg text-main cursor-pointer"
            >
              Login
            </button>
          )}
        </div>
      </div>

      {/* Main Section */}
      <div className="flex flex-col-reverse md:flex-row justify-around items-center h-full">
        <div className="flex flex-col justify-center items-center py-10 w-full">
          <div className="flex flex-col gap-5 items-center md:items-start">
            <div className="text-7xl text-main -mt-3">Cut,</div>
            <div className="text-7xl text-main -mt-3">Highlight,</div>
            <div className="text-2xl text-gray-800 ">
              and Perfect Your Clips in Seconds!
            </div>
            <button
              onClick={() => nav("/editor")}
              className="bg-main text-white px-10 py-5 rounded-md text-xl duration-200 transition-all cursor-pointer"
            >
              Try AI Trimmer Now
            </button>
          </div>
        </div>
        <div className="flex justify-center w-full">
          <DotLottieReact
            src="https://lottie.host/dd2a6804-fc87-46f4-865c-b90d2e8573b7/OGFDMb4nib.lottie"
            loop
            autoplay
          />
        </div>
      </div>
    </div>
  );
};

export default Landing;
