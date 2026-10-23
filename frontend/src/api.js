import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
let refreshing = null;

// On 401, rotate the refresh token once and retry. If that fails, tell the app the session is over.
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const { config, response } = err;
    if (response?.status === 401 && config && !config._retried && !NO_REFRESH.includes(config.url)) {
      config._retried = true;
      try {
        refreshing = refreshing || api.post('/auth/refresh').finally(() => { refreshing = null; });
        await refreshing;
        return api(config);
      } catch {
        window.dispatchEvent(new Event('auth:expired'));
      }
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e) => {
  if (!e.response) return 'Network error. Check your connection and try again.';
  if (e.response.status === 429) return e.response.data?.message || 'Too many attempts. Try again later.';
  return e.response.data?.message || 'Request failed. Please try again.';
};

export default api;
