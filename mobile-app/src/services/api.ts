import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Config from 'react-native-config';

// API Configuration
const API_BASE_URL = Config.API_URL || (
  Platform.OS === 'ios' 
    ? 'http://localhost:3000/api/v1'
    : 'http://10.0.2.2:3000/api/v1'
);

const API_TIMEOUT = 30000; // 30 seconds

// Token management
const TOKEN_KEY = '@modmaster_access_token';
const REFRESH_TOKEN_KEY = '@modmaster_refresh_token';

class ApiService {
  private api: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            if (newToken) {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            await this.clearTokens();
            // Emit event or use navigation service to redirect to login
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Token Management
  async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  async setTokens(accessToken: string, refreshToken: string) {
    try {
      await AsyncStorage.multiSet([
        [TOKEN_KEY, accessToken],
        [REFRESH_TOKEN_KEY, refreshToken],
      ]);
    } catch (error) {
      console.error('Error setting tokens:', error);
    }
  }

  async clearTokens() {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  private async refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
        await this.setTokens(accessToken, newRefreshToken);

        return accessToken;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Auth Endpoints
  async register(data: {
    email: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    const response = await this.api.post('/auth/register', data);
    const { tokens, user } = response.data.data;
    await this.setTokens(tokens.accessToken, tokens.refreshToken);
    return { user, tokens };
  }

  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', { email, password });
    const { tokens, user } = response.data.data;
    await this.setTokens(tokens.accessToken, tokens.refreshToken);
    return { user, tokens };
  }

  async logout() {
    try {
      await this.api.post('/auth/logout');
    } finally {
      await this.clearTokens();
    }
  }

  async getMe() {
    const response = await this.api.get('/auth/me');
    return response.data.data;
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

  // Vehicle Endpoints
  async getMyVehicles(params?: { page?: number; limit?: number; sort?: string }) {
    const response = await this.api.get('/vehicles/my-vehicles', { params });
    return response.data.data;
  }

  async createVehicle(data: {
    vin?: string;
    make: string;
    model: string;
    year: number;
    trim?: string;
    engineType?: string;
    mileage?: number;
    nickname?: string;
    isPrimary?: boolean;
  }) {
    const response = await this.api.post('/vehicles', data);
    return response.data.data;
  }

  async getVehicle(id: string) {
    const response = await this.api.get(`/vehicles/${id}`);
    return response.data.data;
  }

  async updateVehicle(id: string, data: Partial<any>) {
    const response = await this.api.put(`/vehicles/${id}`, data);
    return response.data.data;
  }

  async deleteVehicle(id: string) {
    const response = await this.api.delete(`/vehicles/${id}`);
    return response.data;
  }

  async addModification(vehicleId: string, modification: any) {
    const response = await this.api.post(`/vehicles/${vehicleId}/modifications`, modification);
    return response.data.data;
  }

  async uploadVehicleImages(vehicleId: string, images: any[]) {
    const formData = new FormData();
    images.forEach((image, index) => {
      formData.append('images', {
        uri: image.uri,
        type: image.type || 'image/jpeg',
        name: image.name || `image-${index}.jpg`,
      } as any);
    });

    const response = await this.api.post(`/vehicles/${vehicleId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  }

  // Parts Endpoints
  async searchParts(params: {
    q?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    compatibleWith?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }) {
    const response = await this.api.get('/parts/search', { params });
    return response.data.data;
  }

  async getTrendingParts(category?: string, limit = 10) {
    const response = await this.api.get('/parts/trending', { 
      params: { category, limit } 
    });
    return response.data.data;
  }

  async getPartCategories() {
    const response = await this.api.get('/parts/categories');
    return response.data.data;
  }

  async getPart(id: string, vehicleId?: string) {
    const response = await this.api.get(`/parts/${id}`, {
      params: { vehicleId }
    });
    return response.data.data;
  }

  async getCompatibleParts(vehicleId: string, category?: string, page = 1, limit = 20) {
    const response = await this.api.get(`/parts/compatible/${vehicleId}`, {
      params: { category, page, limit }
    });
    return response.data.data;
  }

  // Scan Endpoints
  async createScan(vehicleId: string, scanType: string, imageUri: string, notes?: string) {
    const formData = new FormData();
    formData.append('vehicleId', vehicleId);
    formData.append('scanType', scanType);
    if (notes) formData.append('notes', notes);
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'scan.jpg',
    } as any);

    const response = await this.api.post('/scans/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  }

  async getMyScans(params?: {
    vehicleId?: string;
    scanType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await this.api.get('/scans/my-scans', { params });
    return response.data.data;
  }

  async getScan(id: string) {
    const response = await this.api.get(`/scans/${id}`);
    return response.data.data;
  }

  async getScanStatus(id: string) {
    const response = await this.api.get(`/scans/${id}/status`);
    return response.data.data;
  }

  async retryScan(id: string) {
    const response = await this.api.post(`/scans/${id}/retry`);
    return response.data.data;
  }

  async submitScanFeedback(id: string, feedback: {
    accuracy: number;
    misidentifiedParts?: string[];
    missedParts?: string[];
    comments?: string;
  }) {
    const response = await this.api.post(`/scans/${id}/feedback`, feedback);
    return response.data;
  }

  // Recommendations Endpoints
  async getRecommendations(params?: {
    type?: 'all' | 'parts' | 'projects' | 'maintenance';
    vehicleId?: string;
    category?: string;
    budget?: number;
    page?: number;
    limit?: number;
  }) {
    const response = await this.api.get('/recommendations', { params });
    return response.data.data;
  }

  async getAIPoweredRecommendations(vehicleId?: string) {
    const response = await this.api.get('/recommendations/ai-powered', {
      params: { vehicleId }
    });
    return response.data.data;
  }

  async getTrendingModifications(params: {
    make?: string;
    model?: string;
    year?: number;
    category?: string;
    limit?: number;
  }) {
    const response = await this.api.get('/recommendations/trending', { params });
    return response.data.data;
  }

  async submitRecommendationFeedback(id: string, feedback: {
    helpful: boolean;
    reason?: string;
    purchased?: boolean;
  }) {
    const response = await this.api.post(`/recommendations/${id}/feedback`, feedback);
    return response.data;
  }

  async dismissRecommendation(id: string) {
    const response = await this.api.post(`/recommendations/${id}/dismiss`);
    return response.data;
  }

  // Upload helper
  async uploadFile(file: any, endpoint: string) {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type || 'application/octet-stream',
      name: file.name || 'file',
    } as any);

    const response = await this.api.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  }
}

// Export singleton instance
export const api = new ApiService();

// Export types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Helper function to handle API errors
export function handleApiError(error: any): ApiError {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.response?.status === 404) {
      return {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      };
    }
    if (error.response?.status === 500) {
      return {
        code: 'SERVER_ERROR',
        message: 'Server error occurred',
      };
    }
    if (error.code === 'ECONNABORTED') {
      return {
        code: 'TIMEOUT',
        message: 'Request timeout',
      };
    }
    if (!error.response) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection.',
      };
    }
  }
  
  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || 'An unknown error occurred',
  };
}