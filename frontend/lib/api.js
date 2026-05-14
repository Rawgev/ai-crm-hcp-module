import axios from "axios";

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "/api"
).replace(/\/+$/, "");

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const fallbackMessage = "Backend service temporarily unavailable";
    error.normalizedMessage = error.response?.data?.message || error.message || fallbackMessage;
    return Promise.reject(error);
  }
);
