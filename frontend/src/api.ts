import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { Accept: "application/json" },
  timeout: 20000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((item) => item?.msg || String(item)).join(", ");
    }
    if (typeof error.response?.data?.message === "string") return error.response.data.message;
    if (error.code === "ECONNABORTED") return "The server took too long to respond.";
    if (!error.response) return "Cannot reach the API. Check that FastAPI is running and VITE_API_URL is correct.";
    return error.message || "The request failed.";
  }
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export default api;
