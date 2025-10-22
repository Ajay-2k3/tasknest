import axios, { AxiosResponse, AxiosError } from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          // Use the same configured API client to respect baseURL and headers
          const response = await api.post('/auth/refresh', { refreshToken });
          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_err) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// API service functions
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (userData: any) =>
    api.post('/auth/register', userData),
  
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  
  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  
  verifyToken: () =>
    api.get('/auth/verify'),
  
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
  
  acceptInvite: (token: string, userData: any) =>
    api.post('/auth/accept-invite', { token, ...userData }),
  
  getProfile: () =>
    api.get('/auth/profile'),
  
  updateProfile: (userData: any) =>
    api.put('/auth/profile', userData),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
  
  deleteAccount: (password: string) =>
    api.delete('/auth/account', { data: { password } }),
};

export const usersAPI = {
  getUsers: (params?: any) =>
    api.get('/users', { params }),
  
  getUser: (id: string) =>
    api.get(`/users/${id}`),
  
  updateUser: (id: string, userData: any) =>
    api.put(`/users/${id}`, userData),
  
  deactivateUser: (id: string) =>
    api.patch(`/users/${id}/deactivate`),
  
  activateUser: (id: string) =>
    api.patch(`/users/${id}/activate`),
};

export const tenantsAPI = {
  getTenants: (params?: any) =>
    api.get('/tenants', { params }),
  
  getTenant: (id: string) =>
    api.get(`/tenants/${id}`),
  
  createTenant: (tenantData: any) =>
    api.post('/tenants', tenantData),
  
  updateTenant: (id: string, tenantData: any) =>
    api.put(`/tenants/${id}`, tenantData),
  
  deleteTenant: (id: string) =>
    api.delete(`/tenants/${id}`),
  
  activateTenant: (id: string) =>
    api.patch(`/tenants/${id}/activate`),
  
  getTenantStats: () =>
    api.get('/tenants/stats'),
};

export const projectsAPI = {
  getProjects: (params?: any) =>
    api.get('/projects', { params }),
  
  getProject: (id: string) =>
    api.get(`/projects/${id}`),
  
  createProject: (projectData: any) =>
    api.post('/projects', projectData),
  
  updateProject: (id: string, projectData: any) =>
    api.put(`/projects/${id}`, projectData),
  
  deleteProject: (id: string) =>
    api.delete(`/projects/${id}`),
  
  getMyTasks: (params?: any) =>
    api.get('/projects/admin/my-tasks', { params }),
};

export const tasksAPI = {
  getTasks: (params?: any) =>
    api.get('/tasks', { params }),
  
  getTask: (id: string) =>
    api.get(`/tasks/${id}`),
  
  createTask: (taskData: any) =>
    api.post('/tasks', taskData),
  
  updateTask: (id: string, taskData: any) =>
    api.put(`/tasks/${id}`, taskData),
  
  deleteTask: (id: string) =>
    api.delete(`/tasks/${id}`),
  
  acceptTask: (id: string) =>
    api.patch(`/tasks/${id}/accept`),
  
  updateTaskStatus: (id: string, status: string) =>
    api.patch(`/tasks/${id}/status`, { status }),
  
  logTaskTime: (id: string, hoursToAdd: number) =>
    api.patch(`/tasks/${id}/time`, { hoursToAdd }),
  
  updateChecklist: (id: string, checklistItems: any[]) =>
    api.patch(`/tasks/${id}/checklist`, { checklistItems }),
  
  addComment: (id: string, text: string) =>
    api.post(`/tasks/${id}/comments`, { text }),
};

export const analyticsAPI = {
  getDashboard: () =>
    api.get('/analytics/dashboard'),
  
  getProjects: () =>
    api.get('/analytics/projects'),
  
  getWorkload: () =>
    api.get('/analytics/workload'),
};

export const notificationsAPI = {
  getNotifications: (params?: any) =>
    api.get('/notifications', { params }),
  
  markAsRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),
  
  markAllAsRead: () =>
    api.patch('/notifications/mark-all-read'),
  
  deleteNotification: (id: string) =>
    api.delete(`/notifications/${id}`),
};

export const eventsAPI = {
  getEvents: (params?: any) =>
    api.get('/events', { params }),
  
  createEvent: (eventData: any) =>
    api.post('/events', eventData),
  
  updateEvent: (id: string, eventData: any) =>
    api.put(`/events/${id}`, eventData),
  
  deleteEvent: (id: string) =>
    api.delete(`/events/${id}`),
};

export const filesAPI = {
  uploadTaskFile: (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/files/tasks/${taskId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  deleteTaskFile: (taskId: string, attachmentId: string) =>
    api.delete(`/files/tasks/${taskId}/attachments/${attachmentId}`),
  
  getFile: (filename: string) =>
    api.get(`/files/${filename}`, { responseType: 'blob' }),
};

export const searchAPI = {
  globalSearch: (query: string, params?: any) =>
    api.get('/search', { params: { q: query, ...params } }),
  
  getSuggestions: (query: string) =>
    api.get('/search/suggestions', { params: { q: query } }),
};

export const adminAPI = {
  createUser: (userData: any) =>
    api.post('/admin/create-user', userData),
  
  getDashboardStats: () =>
    api.get('/admin/dashboard-stats'),
};

export default api;