import io, { Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import Config from 'react-native-config';
import { api } from './api';
import { store } from '../store';
import { updateScanStatus, updateScanResults } from '../store/slices/scanSlice';

// Socket configuration
const SOCKET_URL = Config.SOCKET_URL || (
  Platform.OS === 'ios' 
    ? 'http://localhost:3000'
    : 'http://10.0.2.2:3000'
);

class ScanService {
  private socket: Socket | null = null;
  private subscriptions: Map<string, () => void> = new Map();

  async connect() {
    if (this.socket?.connected) {
      return;
    }

    const token = await api.getAccessToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Scan event handlers
    this.socket.on('scan:progress', (data) => {
      this.handleScanProgress(data);
    });

    this.socket.on('scan:complete', (data) => {
      this.handleScanComplete(data);
    });

    this.socket.on('scan:error', (data) => {
      this.handleScanError(data);
    });

    // Other real-time events
    this.socket.on('recommendations:update', (data) => {
      this.handleRecommendationsUpdate(data);
    });

    this.socket.on('price:alert', (data) => {
      this.handlePriceAlert(data);
    });
  }

  disconnect() {
    if (this.socket) {
      // Unsubscribe from all scans
      this.subscriptions.forEach((_, scanId) => {
        this.unsubscribeScan(scanId);
      });

      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Subscribe to scan updates
  subscribeScan(scanId: string, callback?: (update: any) => void) {
    if (!this.socket) {
      console.warn('Socket not connected');
      return;
    }

    this.socket.emit('subscribe:scan', scanId);
    
    if (callback) {
      this.subscriptions.set(scanId, callback);
    }

    return () => {
      this.unsubscribeScan(scanId);
    };
  }

  // Unsubscribe from scan updates
  unsubscribeScan(scanId: string) {
    if (!this.socket) return;

    this.socket.emit('unsubscribe:scan', scanId);
    this.subscriptions.delete(scanId);
  }

  // Join vehicle room for updates
  joinVehicleRoom(vehicleId: string) {
    if (!this.socket) return;
    this.socket.emit('join:vehicle', vehicleId);
  }

  // Leave vehicle room
  leaveVehicleRoom(vehicleId: string) {
    if (!this.socket) return;
    this.socket.emit('leave:vehicle', vehicleId);
  }

  // Handle scan progress updates
  private handleScanProgress(data: {
    scanId: string;
    progress: number;
    status: string;
  }) {
    // Update Redux store
    store.dispatch(updateScanStatus({
      id: data.scanId,
      status: data.status as any,
      progress: data.progress,
    }));

    // Call specific callback if registered
    const callback = this.subscriptions.get(data.scanId);
    if (callback) {
      callback({
        type: 'progress',
        ...data,
      });
    }
  }

  // Handle scan completion
  private handleScanComplete(data: {
    scanId: string;
    results: any;
  }) {
    // Update Redux store
    store.dispatch(updateScanResults({
      id: data.scanId,
      identifiedParts: data.results.identifiedParts || [],
      aiAnalysisResults: data.results.aiAnalysisResults,
      vinData: data.results.vinData,
    }));

    // Call specific callback if registered
    const callback = this.subscriptions.get(data.scanId);
    if (callback) {
      callback({
        type: 'complete',
        ...data,
      });
    }

    // Show notification
    this.showNotification('Scan Complete', 'Your vehicle scan has been processed successfully!');
  }

  // Handle scan errors
  private handleScanError(data: {
    scanId: string;
    error: string;
  }) {
    // Update Redux store
    store.dispatch(updateScanStatus({
      id: data.scanId,
      status: 'failed',
      error: data.error,
    }));

    // Call specific callback if registered
    const callback = this.subscriptions.get(data.scanId);
    if (callback) {
      callback({
        type: 'error',
        ...data,
      });
    }

    // Show notification
    this.showNotification('Scan Failed', data.error || 'An error occurred during scan processing');
  }

  // Handle recommendations update
  private handleRecommendationsUpdate(data: {
    recommendations: any[];
  }) {
    // Update recommendations in Redux store
    // This would be implemented based on your recommendation slice
    console.log('New recommendations:', data.recommendations);
  }

  // Handle price alerts
  private handlePriceAlert(data: {
    alert: {
      partId: string;
      partName: string;
      previousPrice: number;
      currentPrice: number;
      discount: number;
    };
  }) {
    const { alert } = data;
    const message = `${alert.partName} is now ${alert.discount}% off! Was $${alert.previousPrice}, now $${alert.currentPrice}`;
    this.showNotification('Price Drop Alert!', message);
  }

  // Show notification (would use a proper notification library)
  private showNotification(title: string, body: string) {
    // This would use react-native-push-notification or similar
    console.log(`Notification: ${title} - ${body}`);
  }

  // Get connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Reconnect if disconnected
  async reconnect() {
    if (!this.isConnected()) {
      await this.connect();
    }
  }
}

// Export singleton instance
export const scanService = new ScanService();

// Helper function to subscribe to scan updates
export function subscribeScanUpdates(scanId: string, callback: (update: any) => void) {
  return scanService.subscribeScan(scanId, callback);
}

// Helper function to get scan status
export async function getScanStatus(scanId: string) {
  try {
    const response = await api.getScanStatus(scanId);
    return response;
  } catch (error) {
    console.error('Error fetching scan status:', error);
    throw error;
  }
}

// Initialize socket connection when app starts
export async function initializeSocketConnection() {
  try {
    await scanService.connect();
  } catch (error) {
    console.error('Failed to initialize socket connection:', error);
  }
}

// Clean up socket connection
export function cleanupSocketConnection() {
  scanService.disconnect();
}