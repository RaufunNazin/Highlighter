import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "./api";

const Highlights = () => {
  const nav = useNavigate();
  const [segments, setSegments] = useState([]);
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finalVideo, setFinalVideo] = useState(null);

  const videoName = localStorage.getItem("lastVideo");

  useEffect(() => {
    if (!videoName) {
      toast.error("No video found. Upload a video first.");
      nav("/");
      return;
    }
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/segments/video/${videoName}`);
      setSegments(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching segments:", error);
      toast.error("Failed to fetch segments.");
      setLoading(false);
    }
  };

  const toggleSegment = (segment) => {
    if (selectedSegments.includes(segment)) {
      setSelectedSegments(selectedSegments.filter((s) => s !== segment));
    } else {
      setSelectedSegments([...selectedSegments, segment]);
    }
  };

  const concatenateVideos = async () => {
    if (selectedSegments.length === 0) {
      toast.error("Please select at least one segment.");
      return;
    }

    setProcessing(true);
    try {
      const response = await api.post(
        "/trim_video/",
        { segment_names: selectedSegments },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setFinalVideo(response.data.final_video_url);
      localStorage.setItem("finalVideo", response.data.final_video_url);
      setProcessing(false);
      setFinished(true);
      toast.success("Video created successfully!");
    } catch (error) {
      console.error("Error concatenating videos:", error);
      toast.error("Failed to create final video.");
      setProcessing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
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

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col justify-center items-center h-full gap-3 pb-20">
          <DotLottieReact
            src="https://lottie.host/c6e85f0e-ab1d-432f-9934-9685070ebbe5/lRV5Zqr8tM.lottie"
            loop
            autoplay
            className="md:w-1/3"
          />
          <div className="text-2xl md:text-3xl text-main">
            Fetching Segments...
          </div>
        </div>
      )}

      {/* Video Selection */}
      {!loading && !processing && !finished && (
        <div className="flex flex-col justify-center items-center h-full gap-5">
          <div className="text-2xl md:text-3xl text-main">
            Select Clips to Keep
          </div>

          {/* Slider for Video Segments */}
          <div className="w-full flex overflow-x-auto gap-4 p-4">
            {segments.map((segment) => (
              <div
                key={segment.id}
                className={`border-3 rounded-md p-1 cursor-pointer transition-all ${
                  selectedSegments.includes(segment.segment)
                    ? "border-main"
                    : "border-transparent"
                }`}
                onClick={() => toggleSegment(segment.segment)}
              >
                <video
                  src={`http://localhost:8000/static/${segment.segment}`}
                  className="min-w-96 h-96 object-cover rounded-md"
                  controls
                  muted
                />
              </div>
            ))}
          </div>

          <div>
            {selectedSegments.length > 0 && (
              <div className="text-gray-800">
                <span className="text-main">{selectedSegments.length}</span> clips selected
              </div>
            )}
          </div>

          {/* Concatenate Button */}
          <button
            onClick={concatenateVideos}
            className="bg-main text-white px-10 py-5 rounded-md text-xl transition-all cursor-pointer"
          >
            Create Final Video
          </button>
        </div>
      )}

      {/* Processing State */}
      {processing && (
        <div className="flex flex-col justify-center items-center h-full gap-3 pb-20">
          <div className="text-2xl md:text-3xl text-main">
            Creating Video...
          </div>
          <DotLottieReact
            src="https://lottie.host/c6e85f0e-ab1d-432f-9934-9685070ebbe5/lRV5Zqr8tM.lottie"
            loop
            autoplay
            className="md:w-1/3"
          />
        </div>
      )}

      {/* Finished State */}
      {finished && (
        <div className="flex flex-col justify-center items-center h-full gap-3 flex-1">
          <div className="text-2xl md:text-3xl text-gray-800">
            Your Final Video is Ready!
          </div>
          <video
            src={`http://localhost:8000/static/${finalVideo}`}
            controls
            className="w-2/3 rounded-md shadow-lg"
          />
          <button
            onClick={() => nav("/")}
            className="bg-main text-white px-10 py-5 rounded-md text-xl transition-all cursor-pointer mt-5"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default Highlights;
