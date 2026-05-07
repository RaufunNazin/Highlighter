import "./App.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Landing from "./Landing";
import NotFound from "./NotFound";
import Editor from "./Editor";
import Login from "./Login";
import Register from "./Register";
import Highlights from "./Highlights";
import ModelComparison from "./ModelComparison";
import JobTracker from "./JobTracker";
import JobsList from "./JobsList";

import Layout from "./Layout";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout><Landing /></Layout>,
  },
  {
    path: "/editor",
    element: <Layout><Editor /></Layout>,
  },
  {
    path: "/highlights",
    element: <Layout><Highlights /></Layout>,
  },
  {
    path: "/compare",
    element: <Layout><ModelComparison /></Layout>,
  },
  {
    path: "/jobs",
    element: <Layout><JobsList /></Layout>,
  },
  {
    path: "/jobs/:jobId",
    element: <Layout><JobTracker /></Layout>,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
