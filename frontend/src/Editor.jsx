import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "./api";

const Editor = () => {
  const nav = useNavigate();
  const [videoFile, setVideoFile] = useState(null);
  const [subtitleFile, setSubtitleFile] = useState(null);
  const [videoFileName, setVideoFileName] = useState(null);
  const [subtitleFileName, setSubtitleFileName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [segmentGenerated, setSegmentGenerated] = useState(false);
  const [data, setData] = useState(null);

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "video/mp4") {
      setVideoFile(file);
      setVideoFileName(file.name);
    } else {
      toast.error("Please select a valid MP4 video file.");
    }
  };

  const handleSubtitleChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith(".srt")) {
      setSubtitleFile(file);
      setSubtitleFileName(file.name);
    } else {
      toast.error("Please select a valid SRT subtitle file.");
    }
  };

  const getSegments = () => {
    if (!videoFile || !subtitleFile) {
      toast.error("Please select both video and subtitle files.");
      return;
    }

    setLoading(true);

    // Create FormData object
    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("subtitle", subtitleFile);

    api
      .post("/create_segments", formData, {
        headers: {
          "Content-Type": "multipart/form-data", // Ensure correct content type
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((response) => {
        console.log(response.data);
        setData(response.data);
        localStorage.setItem("lastVideo", response.data.video_url);
        toast.success("Highlights generated successfully!");
        setLoading(false);
        setSegmentGenerated(true);
      })
      .catch((error) => {
        console.error("Error generating highlights:", error);
        toast.error("Failed to generate highlights.");
        setLoading(false);
      });
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Toast Notifications */}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

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
      {loading === false && !segmentGenerated ? (
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
              <label className="border border-gray-600 text-gray-600 px-5 py-1 rounded-lg cursor-pointer hover:bg-opacity-80">
                {videoFileName ? videoFileName : "Select Video File"}
                <input
                  type="file"
                  accept="video/mp4"
                  className="hidden"
                  onChange={handleVideoChange}
                />
              </label>
            </div>

            <div className="flex flex-col justify-center items-center gap-3">
              {/* Subtitle Upload */}
              <label className="border border-gray-600 text-gray-600 px-5 py-1 rounded-lg cursor-pointer hover:bg-opacity-80">
                {subtitleFileName ? subtitleFileName : "Select Subtitle File"}
                <input
                  type="file"
                  accept=".srt"
                  className="hidden"
                  onChange={handleSubtitleChange}
                />
              </label>
            </div>
            <button
              onClick={() => getSegments()}
              className="bg-main text-white px-5 md:px-10 py-3 md:py-5 rounded-md text-xl duration-200 transition-all cursor-pointer mt-5"
            >
              Generate Highlights
            </button>
          </div>
        </div>
      ) : loading === true && !segmentGenerated ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 pb-20">
          <div className="text-2xl md:text-3xl  text-main">
            Generating Highlights...
          </div>
          <DotLottieReact
            src="https://lottie.host/c6e85f0e-ab1d-432f-9934-9685070ebbe5/lRV5Zqr8tM.lottie"
            loop
            autoplay
            className="md:w-1/3"
          />
          <div className="text-sm md:text-lg  text-gray-600">
            Hang tight, This may take a few minutes
          </div>
        </div>
      ) : (
        loading === false &&
        segmentGenerated && (
          <div className="flex flex-col justify-center items-center h-full gap-3 pb-20">
            <div className="text-2xl md:text-3xl  text-main">
              Highlights Generated Successfully!
            </div>
            <DotLottieReact
              src="https://lottie.host/afb49e66-4eed-4378-ba92-254583f9a01f/HXB9sbF2lG.lottie"
              loop
              autoplay
              className="md:w-1/3"
            />
            <div className="text-sm md:text-lg  text-gray-600">
              {data && data?.total_segments && data?.total_segments && (
                <div>
                  <span className="text-main">{data?.total_segments}</span>{" "}
                  Highlights Generated in{" "}
                  <span className="text-main">{parseFloat(data?.total_time).toFixed(2)}</span> seconds
                </div>
              )}
            </div>
            <button
              onClick={() => nav("/highlights")}
              className="bg-main text-white px-10 py-5 rounded-md  text-xl duration-200 transition-all cursor-pointer mt-5"
            >
              Select Clips
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default Editor;
