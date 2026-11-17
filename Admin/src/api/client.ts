import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Sends and receives httpOnly session cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Attach Authorization Bearer token as fallback for iOS/Safari ITP cross-site cookie blocking
api.interceptors.request.use((config) => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // Ignore localStorage access restrictions in private browsing if any
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const tokenHeader = response.headers?.['x-session-token'];
    if (tokenHeader && typeof window !== 'undefined') {
      try {
        localStorage.setItem('auth_token', tokenHeader);
      } catch (e) {}
    }
    return response.data;
  },
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

