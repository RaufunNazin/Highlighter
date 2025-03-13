import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Editor = () => {
  const nav = useNavigate();
  const [videoFile, setVideoFile] = useState(null);
  const [subtitleFile, setSubtitleFile] = useState(null);

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "video/mp4") {
      setVideoFile(file.name);
    } else {
      toast.error("Please select a valid MP4 video file.");
    }
  };

  const handleSubtitleChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith(".srt")) {
      setSubtitleFile(file.name);
    } else {
      toast.error("Please select a valid SRT subtitle file.");
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Toast Notifications */}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

      {/* Navbar */}
      <div className="flex justify-center w-full py-5">
        <button className="text-3xl text-main cursor-pointer" onClick={() => nav("/")}>
          HighLighter
        </button>
      </div>

      {/* Main Section */}
      <div className="flex flex-col justify-center items-center h-full gap-3 pb-20">
        <DotLottieReact
          src="https://lottie.host/5f456391-ce12-4050-93d9-fb4a0b4ffb37/v02JPkWT5U.lottie"
          loop
          autoplay
          className="md:w-1/3"
        />
        <div className="text-2xl md:text-3xl  text-main">
          Upload Your Video and Subtitle File
        </div>
        <div className="text-sm md:text-lg  text-gray-600">
          Supported Formats: MP4 for Video, SRT for Subtitles
        </div>
        {/* File Upload Buttons */}
        <div className="flex flex-col gap-4 mt-5">
          <div className="flex flex-col justify-center items-center gap-3">
            {/* Video Upload */}
            <label className="border-2 border-main text-main px-5 py-1 rounded-lg cursor-pointer hover:bg-opacity-80">
              Select Video File
              <input
                type="file"
                accept="video/mp4"
                className="hidden"
                onChange={handleVideoChange}
              />
            </label>
            {videoFile && <div className="text-gray-700 ">{videoFile}</div>}
          </div>

          <div className="flex flex-col justify-center items-center gap-3">
            {/* Subtitle Upload */}
            <label className="border-2 border-main text-main px-5 py-1 rounded-lg cursor-pointer hover:bg-opacity-80">
              Select Subtitle File
              <input
                type="file"
                accept=".srt"
                className="hidden"
                onChange={handleSubtitleChange}
              />
            </label>
            {subtitleFile && (
              <div className="text-gray-700 ">{subtitleFile}</div>
            )}
          </div>
          <button className="bg-main text-white px-10 py-5 rounded-md  text-xl duration-200 transition-all cursor-pointer mt-5">
            Generate Highlights
          </button>
        </div>
      </div>
    </div>
  );
};

export default Editor;
