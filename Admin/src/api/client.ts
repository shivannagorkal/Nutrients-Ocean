import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Sends and receives httpOnly session cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorData = error.response?.data?.error;
    const message = errorData?.message || error.message || 'An error occurred';
    const err = new Error(message) as Error & { code?: string; details?: any; status?: number };
    err.code = errorData?.code;
    err.details = errorData?.details;
    err.status = error.response?.status;
    return Promise.reject(err);
  }
);

export default api;

