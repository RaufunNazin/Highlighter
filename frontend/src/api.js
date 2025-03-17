import axios from "axios";

export default axios.create({
  baseURL: `http://localhost:8000/`,
  timeout: 1200000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});