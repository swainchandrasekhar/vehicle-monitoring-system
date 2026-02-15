import axios from 'axios';
import config from '../config';

const api = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
};

export const vehicleAPI = {
  getAll: (params) => api.get('/vehicles', { params }),
  getOne: (id) => api.get(`/vehicles/${id}`),
  updateLocation: (id, location) => api.post(`/vehicles/${id}/location`, location),
  getHistory: (id, params) => api.get(`/vehicles/${id}/history`, { params }),
  findNearby: (params) => api.get('/vehicles/nearby', { params }),
};

export const accidentAPI = {
  getAll: (params) => api.get('/accidents', { params }),
  report: (data) => api.post('/accidents', data),
  getAlerts: (params) => api.get('/accidents/alerts', { params }),
};

export default api;
