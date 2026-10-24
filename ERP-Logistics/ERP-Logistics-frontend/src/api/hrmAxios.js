import axios from 'axios';

const hrmApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

hrmApi.interceptors.request.use(config => {
  const token = localStorage.getItem('hrmToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


hrmApi.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !err.config._skipHRMRedirect) {
      const token = localStorage.getItem('hrmToken');
      if (token !== 'hrm-superadmin-static') {
        localStorage.removeItem('hrmToken');
        localStorage.removeItem('hrmEmployee');
        window.location.href = '/hrm/login';
      }
    }
    return Promise.reject(err);
  }
);

export default hrmApi;
