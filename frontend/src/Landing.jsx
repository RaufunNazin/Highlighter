import React from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const nav = useNavigate();
  return (
    <div className="h-screen flex flex-col">
      {/* Navbar */}
      <div className="flex justify-center w-full py-5">
        <div className="text-3xl text-main cursor-pointer">HighLighter</div>
        <div className="flex justify-center items-center gap-10">
          {/* <button className="text-main text-xl  font-light underline-offset-3 duration-200 transition-all cursor-pointer">
            Home
          </button>
          <button className="text-main text-xl  font-light underline-offset-3 duration-200 transition-all cursor-pointer">
            Use AI Trimmer
          </button>
          <button className="text-main text-xl  font-light underline-offset-3 duration-200 transition-all cursor-pointer">
            Help
          </button> */}
        </div>
      </div>

      {/* Main Section */}
      <div className="flex flex-col-reverse md:flex-row justify-around items-center h-full">
        <div className="flex flex-col justify-center items-center py-10">
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
        <div className="flex justify-center">
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
