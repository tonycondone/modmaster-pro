import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/constants';

class ApiService {
  private api: AxiosInstance;
  private refreshingToken = false;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await SecureStore.getItemAsync('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.refreshingToken) {
            // Wait for token refresh to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.api(originalRequest);
          }

          originalRequest._retry = true;
          this.refreshingToken = true;

          try {
            const refreshToken = await SecureStore.getItemAsync('refreshToken');
            const sessionId = await SecureStore.getItemAsync('sessionId');

            if (refreshToken && sessionId) {
              const response = await this.api.post('/auth/refresh', {
                refreshToken,
                sessionId,
              });

              const { accessToken } = response.data.data;
              await SecureStore.setItemAsync('accessToken', accessToken);

              this.refreshingToken = false;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            this.refreshingToken = false;
            // Redirect to login
            await this.logout();
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async logout() {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('sessionId');
    // Emit logout event
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', { email, password });
    return response.data;
  }

  async register(data: any) {
    const response = await this.api.post('/auth/register', data);
    return response.data;
  }

  async verifyEmail(token: string) {
    const response = await this.api.post('/auth/verify-email', { token });
    return response.data;
  }

  async forgotPassword(email: string) {
    const response = await this.api.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, password: string) {
    const response = await this.api.post('/auth/reset-password', { token, password });
    return response.data;
  }

  async getMe() {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  // Vehicle endpoints
  async getMyVehicles(params?: any) {
    const response = await this.api.get('/vehicles/my-vehicles', { params });
    return response.data;
  }

  async getVehicle(id: string) {
    const response = await this.api.get(`/vehicles/${id}`);
    return response.data;
  }

  async createVehicle(data: any) {
    const response = await this.api.post('/vehicles', data);
    return response.data;
  }

  async updateVehicle(id: string, data: any) {
    const response = await this.api.put(`/vehicles/${id}`, data);
    return response.data;
  }

  async deleteVehicle(id: string) {
    const response = await this.api.delete(`/vehicles/${id}`);
    return response.data;
  }

  // Parts endpoints
  async searchParts(params: any) {
    const response = await this.api.get('/parts/search', { params });
    return response.data;
  }

  async getPart(id: string) {
    const response = await this.api.get(`/parts/${id}`);
    return response.data;
  }

  async getTrendingParts(params?: any) {
    const response = await this.api.get('/parts/trending', { params });
    return response.data;
  }

  async getPartCategories() {
    const response = await this.api.get('/parts/categories');
    return response.data;
  }

  // Scan endpoints
  async createScan(data: any) {
    const response = await this.api.post('/scans', data);
    return response.data;
  }

  async getScan(id: string) {
    const response = await this.api.get(`/scans/${id}`);
    return response.data;
  }

  async getMyScans(params?: any) {
    const response = await this.api.get('/scans', { params });
    return response.data;
  }

  // Marketplace endpoints
  async getPartPrices(partId: string) {
    const response = await this.api.get(`/marketplace/prices/${partId}`);
    return response.data;
  }

  async getDeals(params?: any) {
    const response = await this.api.get('/marketplace/deals', { params });
    return response.data;
  }

  // Project endpoints
  async getMyProjects(params?: any) {
    const response = await this.api.get('/projects/my-projects', { params });
    return response.data;
  }

  async getProject(id: string) {
    const response = await this.api.get(`/projects/${id}`);
    return response.data;
  }

  async createProject(data: any) {
    const response = await this.api.post('/projects', data);
    return response.data;
  }

  async updateProject(id: string, data: any) {
    const response = await this.api.put(`/projects/${id}`, data);
    return response.data;
  }

  // Recommendations
  async getRecommendations(params?: any) {
    const response = await this.api.get('/recommendations', { params });
    return response.data;
  }

  // Image upload
  async uploadImage(uri: string, type: string = 'image/jpeg') {
    const formData = new FormData();
    formData.append('image', {
      uri,
      type,
      name: 'photo.jpg',
    } as any);

    const response = await this.api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }
}

export default new ApiService();