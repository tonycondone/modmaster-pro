import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid, clear storage and redirect to login
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('user');
          // You might want to dispatch a logout action here
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic request methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.put<T>(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.patch<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.delete<T>(url, config);
  }

  // Auth methods
  async login(credentials: { email: string; password: string }) {
    const response = await this.post('/auth/login', credentials);
    if (response.data.token) {
      await AsyncStorage.setItem('authToken', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    const response = await this.post('/auth/register', userData);
    if (response.data.token) {
      await AsyncStorage.setItem('authToken', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } finally {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
    }
  }

  async refreshToken() {
    const response = await this.post('/auth/refresh');
    if (response.data.token) {
      await AsyncStorage.setItem('authToken', response.data.token);
    }
    return response;
  }

  // File upload helper
  async uploadFile(url: string, file: any, onProgress?: (progress: number) => void) {
    const formData = new FormData();
    formData.append('file', file);

    return this.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          onProgress(progress);
        }
      },
    });
  }

  // Vehicle methods
  async getVehicles(page = 1, limit = 10) {
    return this.get(`/vehicles?page=${page}&limit=${limit}`);
  }

  async getVehicleById(id: string) {
    return this.get(`/vehicles/${id}`);
  }

  async createVehicle(vehicleData: any) {
    return this.post('/vehicles', vehicleData);
  }

  async updateVehicle(id: string, vehicleData: any) {
    return this.put(`/vehicles/${id}`, vehicleData);
  }

  async deleteVehicle(id: string) {
    return this.delete(`/vehicles/${id}`);
  }

  // Part methods
  async getParts(filters: any = {}, page = 1, limit = 20) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });
    return this.get(`/parts?${params}`);
  }

  async getPartById(id: string) {
    return this.get(`/parts/${id}`);
  }

  async searchParts(query: string, filters: any = {}) {
    const params = new URLSearchParams({
      q: query,
      ...filters,
    });
    return this.get(`/parts/search?${params}`);
  }

  async addToFavorites(partId: string) {
    return this.post(`/parts/${partId}/favorite`);
  }

  async removeFromFavorites(partId: string) {
    return this.delete(`/parts/${partId}/favorite`);
  }

  async getFavorites(page = 1, limit = 20) {
    return this.get(`/parts/favorites?page=${page}&limit=${limit}`);
  }

  // Scan methods
  async uploadScan(imageUri: string, vehicleId?: string, notes?: string) {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'scan.jpg',
    } as any);
    if (vehicleId) formData.append('vehicleId', vehicleId);
    if (notes) formData.append('notes', notes);

    return this.post('/scans/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async getScans(page = 1, limit = 10, filters: any = {}) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });
    return this.get(`/scans?${params}`);
  }

  async getScanById(id: string) {
    return this.get(`/scans/${id}`);
  }

  async deleteScan(id: string) {
    return this.delete(`/scans/${id}`);
  }

  async retryScan(id: string) {
    return this.post(`/scans/${id}/retry`);
  }

  // User methods
  async getUserProfile() {
    return this.get('/users/profile');
  }

  async updateUserProfile(userData: any) {
    return this.put('/users/profile', userData);
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.put('/users/password', { currentPassword, newPassword });
  }

  async updateSettings(settings: any) {
    return this.put('/users/settings', settings);
  }

  // Cart methods
  async addToCart(partId: string, quantity: number) {
    return this.post('/cart/add', { partId, quantity });
  }

  async updateCartItem(itemId: string, quantity: number) {
    return this.put(`/cart/items/${itemId}`, { quantity });
  }

  async removeFromCart(itemId: string) {
    return this.delete(`/cart/items/${itemId}`);
  }

  async getCart() {
    return this.get('/cart');
  }

  async clearCart() {
    return this.delete('/cart');
  }

  // Order methods
  async createPaymentIntent(orderData: any) {
    return this.post('/payments/create-intent', orderData);
  }

  async confirmPayment(paymentIntentId: string) {
    return this.post('/payments/confirm', { paymentIntentId });
  }

  async getOrders(page = 1, limit = 10) {
    return this.get(`/orders?page=${page}&limit=${limit}`);
  }

  async getOrderById(id: string) {
    return this.get(`/orders/${id}`);
  }

  async cancelOrder(id: string) {
    return this.post(`/orders/${id}/cancel`);
  }

  // Error handling helper
  handleError(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }
}

export const apiService = new ApiService();
export default apiService;