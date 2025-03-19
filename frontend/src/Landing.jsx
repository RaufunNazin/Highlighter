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
      <div className="flex justify-between w-full py-5 px-4 md:px-64 bg-main shadow-md items-center">
        <div className="text-3xl text-white cursor-pointer font-sourGummy">HighLighter</div>
        <div className="flex justify-center items-center">
          {localStorage.getItem("token") ? (
            <div className="flex items-center text-gray-800">
              <div className="py-2 px-5 rounded-l-md bg-white">{JSON.parse(localStorage.getItem("user"))?.username || "User"}</div>
              
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  nav("/login", { state: "logout" });
                }}
                className="bg-red-700 cursor-pointer py-2 px-5 text-white rounded-r-md"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => nav("/login")}
              className="text-main cursor-pointer px-5 py-2 bg-white rounded-md"
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
            <div className="text-5xl md:text-7xl text-main -mt-3">Cut,</div>
            <div className="text-5xl md:text-7xl text-main -mt-3">Highlight,</div>
            <div className="text-xl md:text-2xl text-gray-800 ">
              and Perfect Your Clips in Seconds!
            </div>
            <button
              onClick={() => nav("/editor")}
              className="bg-main text-white px-5 md:px-10 py-3 md:py-5 rounded-md text-xl duration-200 transition-all cursor-pointer"
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
            className="w-[600px] md:w-[800px]"
          />
        </div>
      </div>
    </div>
  );
};

export default Landing;
