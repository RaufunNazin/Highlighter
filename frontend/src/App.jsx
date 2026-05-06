import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./Landing";
import NotFound from "./NotFound";
import Editor from "./Editor";
import Login from "./Login";
import Register from "./Register";
import Highlights from "./Highlights";
import ModelComparison from "./ModelComparison";

import Layout from "./Layout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pages with Layout */}
        <Route path="/" element={<Layout><Landing /></Layout>} />
        <Route path="/editor" element={<Layout><Editor /></Layout>} />
        <Route path="/highlights" element={<Layout><Highlights /></Layout>} />
        <Route path="/compare" element={<Layout><ModelComparison /></Layout>} />
        
        {/* Full screen pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
