import React from "react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const nav = useNavigate();
  return (
    <div className="h-screen flex flex-col justify-center items-center gap-10">
      <div className="text-9xl text-main">404</div>
      <div className="text-3xl text-main">Page Not Found</div>
      <button
        onClick={() => nav("/")}
        className="bg-main text-white px-10 py-5 rounded-md text-xl duration-200 transition-all cursor-pointer"
      >
        Go Home
      </button>
    </div>
  );
};

export default NotFound;
