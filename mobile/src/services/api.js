/**
 * API Service
 * Axios instance with interceptors for authentication
 */

import axios from 'axios';
import { getItemAsync, deleteItemAsync } from '../utils/storage';
import { API_BASE_URL } from '../config/constants';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 - Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear auth data and redirect to login
      await deleteItemAsync('authToken');
      await deleteItemAsync('user');
      
      // You might want to trigger a logout action here
      // This can be done through an event emitter or context
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (data) => api.put('/auth/change-password', data),
  updatePushToken: (token) => api.put('/auth/push-token', { push_token: token }),
};

// User API
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  deactivate: (id) => api.put(`/users/${id}/deactivate`),
  activate: (id) => api.put(`/users/${id}/activate`),
  delete: (id) => api.delete(`/users/${id}`),
  getByDepartment: (department) => api.get(`/users/department/${department}`),
  updateRole: (id, role) => api.put(`/users/${id}/role`, { role }),
};

// Post API
export const postAPI = {
  getFeed: (params) => api.get('/posts/feed', { params }),
  getAll: (params) => api.get('/posts', { params }),
  getById: (id) => api.get(`/posts/${id}`),
  create: (data) => api.post('/posts', data),
  createWithFile: (formData) => api.post('/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.put(`/posts/${id}`, data),
  delete: (id) => api.delete(`/posts/${id}`),
  toggleLike: (id) => api.post(`/posts/${id}/like`),
  markUrgent: (id, isUrgent) => api.put(`/posts/${id}/urgent`, { is_urgent: isUrgent }),
  getByUser: (userId, params) => api.get(`/posts/user/${userId}`, { params }),
};

// Comment API
export const commentAPI = {
  getByPost: (postId, params) => api.get(`/comments/post/${postId}`, { params }),
  create: (postId, data) => api.post(`/comments/post/${postId}`, data),
  update: (id, data) => api.put(`/comments/${id}`, data),
  delete: (id) => api.delete(`/comments/${id}`),
};

// Event API
export const eventAPI = {
  getAll: (params) => api.get('/events', { params }),
  getCalendarEvents: (params) => api.get('/events/calendar', { params }),
  getById: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  createWithFile: (formData) => api.post('/events', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  getQRCode: (id) => api.get(`/events/${id}/qrcode`),
  checkIn: (data) => api.post('/events/checkin', data),
  getAttendance: (id, params) => api.get(`/events/${id}/attendance`, { params }),
  cancel: (id) => api.put(`/events/${id}/cancel`),
};

// Poll API
export const pollAPI = {
  getAll: (params) => api.get('/polls', { params }),
  getById: (id) => api.get(`/polls/${id}`),
  create: (data) => api.post('/polls', data),
  vote: (id, optionId) => api.post(`/polls/${id}/vote`, { option_id: optionId }),
  getResults: (id) => api.get(`/polls/${id}/results`),
  close: (id) => api.put(`/polls/${id}/close`),
  delete: (id) => api.delete(`/polls/${id}`),
  export: (id) => api.get(`/polls/${id}/export`),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getLogins: (params) => api.get('/analytics/logins', { params }),
  getUsers: () => api.get('/analytics/users'),
  getContent: () => api.get('/analytics/content'),
  getEngagement: () => api.get('/analytics/engagement'),
  getCommittees: () => api.get('/analytics/committees'),
  getEvents: () => api.get('/analytics/events'),
};

export default api;
