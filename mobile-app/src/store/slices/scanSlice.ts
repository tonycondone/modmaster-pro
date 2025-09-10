import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
<<<<<<< HEAD
import { apiService } from '@/services/apiService';

export interface Scan {
=======
import apiService from '../../services/apiService';

export interface ScanResult {
>>>>>>> v.3.0
  id: string;
  userId: string;
  vehicleId?: string;
  imageUrl: string;
<<<<<<< HEAD
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results: {
    parts: Array<{
      id: string;
      name: string;
      confidence: number;
      boundingBox: number[];
    }>;
    vehicleInfo?: {
      make: string;
      model: string;
      year: number;
    };
  };
=======
  thumbnailUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: string;
  identifiedParts: Array<{
    partId?: string;
    name: string;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    category?: string;
    suggestedParts?: Array<{
      id: string;
      name: string;
      price: number;
      imageUrl: string;
      matchScore: number;
    }>;
  }>;
  metadata?: {
    imageSize: number;
    imageDimensions: { width: number; height: number };
    processingTime: number;
    modelVersion: string;
  };
  error?: string;
>>>>>>> v.3.0
  createdAt: string;
  updatedAt: string;
}

<<<<<<< HEAD
export interface ScanState {
  scans: Scan[];
  currentScan: Scan | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ScanState = {
  scans: [],
  currentScan: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const uploadScan = createAsyncThunk(
  'scans/uploadScan',
  async (data: { image: string; vehicleId?: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.post('/scans', data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload scan');
=======
export interface ScanSession {
  id: string;
  imageData: string; // Base64 or URI
  timestamp: number;
  retryCount: number;
}

interface ScanState {
  scanHistory: ScanResult[];
  currentScan: ScanResult | null;
  activeScanSession: ScanSession | null;
  isScanning: boolean;
  isProcessing: boolean;
  isLoading: boolean;
  error: string | null;
  scanStats: {
    totalScans: number;
    successfulScans: number;
    failedScans: number;
    averageConfidence: number;
  };
  recentScans: ScanResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const initialState: ScanState = {
  scanHistory: [],
  currentScan: null,
  activeScanSession: null,
  isScanning: false,
  isProcessing: false,
  isLoading: false,
  error: null,
  scanStats: {
    totalScans: 0,
    successfulScans: 0,
    failedScans: 0,
    averageConfidence: 0,
  },
  recentScans: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
};

// Async thunks
export const uploadScanImage = createAsyncThunk(
  'scan/uploadImage',
  async ({ imageData, vehicleId }: { imageData: string | FormData; vehicleId?: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.uploadScanImage(imageData, vehicleId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
>>>>>>> v.3.0
    }
  }
);

<<<<<<< HEAD
export const fetchScans = createAsyncThunk(
  'scans/fetchScans',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get('/scans');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch scans');
=======
export const processScan = createAsyncThunk(
  'scan/processScan',
  async (scanId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.processScan(scanId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const fetchScanHistory = createAsyncThunk(
  'scan/fetchHistory',
  async (params: { page?: number; limit?: number; vehicleId?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await apiService.getScanHistory(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const fetchScanById = createAsyncThunk(
  'scan/fetchById',
  async (scanId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getScanById(scanId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const deleteScan = createAsyncThunk(
  'scan/deleteScan',
  async (scanId: string, { rejectWithValue }) => {
    try {
      await apiService.deleteScan(scanId);
      return scanId;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const retryScan = createAsyncThunk(
  'scan/retryScan',
  async (scanId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.retryScan(scanId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const fetchScanStats = createAsyncThunk(
  'scan/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getScanStats();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
>>>>>>> v.3.0
    }
  }
);

<<<<<<< HEAD
export const getScanById = createAsyncThunk(
  'scans/getScanById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/scans/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get scan');
=======
export const provideScanFeedback = createAsyncThunk(
  'scan/provideFeedback',
  async ({ scanId, feedback }: { scanId: string; feedback: { accurate: boolean; comments?: string } }, { rejectWithValue }) => {
    try {
      const response = await apiService.provideScanFeedback(scanId, feedback);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
>>>>>>> v.3.0
    }
  }
);

const scanSlice = createSlice({
<<<<<<< HEAD
  name: 'scans',
  initialState,
  reducers: {
    setCurrentScan: (state, action: PayloadAction<Scan | null>) => {
      state.currentScan = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Upload scan
      .addCase(uploadScan.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(uploadScan.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentScan = action.payload;
        state.scans.unshift(action.payload);
      })
      .addCase(uploadScan.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch scans
      .addCase(fetchScans.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchScans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.scans = action.payload;
      })
      .addCase(fetchScans.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Get scan by ID
      .addCase(getScanById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getScanById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentScan = action.payload;
      })
      .addCase(getScanById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
=======
  name: 'scan',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    startScanSession: (state, action: PayloadAction<{ imageData: string }>) => {
      state.activeScanSession = {
        id: Date.now().toString(),
        imageData: action.payload.imageData,
        timestamp: Date.now(),
        retryCount: 0,
      };
      state.isScanning = true;
      state.error = null;
    },
    endScanSession: (state) => {
      state.activeScanSession = null;
      state.isScanning = false;
    },
    incrementRetryCount: (state) => {
      if (state.activeScanSession) {
        state.activeScanSession.retryCount += 1;
      }
    },
    updateScanInList: (state, action: PayloadAction<ScanResult>) => {
      const index = state.scanHistory.findIndex(s => s.id === action.payload.id);
      if (index !== -1) {
        state.scanHistory[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Upload scan image
      .addCase(uploadScanImage.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(uploadScanImage.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.currentScan = action.payload;
        state.scanHistory.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(uploadScanImage.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      })
      // Process scan
      .addCase(processScan.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(processScan.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.currentScan = action.payload;
        const index = state.scanHistory.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.scanHistory[index] = action.payload;
        }
      })
      .addCase(processScan.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      })
      // Fetch scan history
      .addCase(fetchScanHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchScanHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.page === 1) {
          state.scanHistory = action.payload.scans;
        } else {
          state.scanHistory = [...state.scanHistory, ...action.payload.scans];
        }
        state.pagination = action.payload.pagination;
        state.recentScans = action.payload.scans.slice(0, 5);
      })
      .addCase(fetchScanHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch scan by ID
      .addCase(fetchScanById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchScanById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentScan = action.payload;
      })
      .addCase(fetchScanById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete scan
      .addCase(deleteScan.fulfilled, (state, action) => {
        state.scanHistory = state.scanHistory.filter(s => s.id !== action.payload);
        if (state.currentScan?.id === action.payload) {
          state.currentScan = null;
        }
        state.pagination.total -= 1;
      })
      // Retry scan
      .addCase(retryScan.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(retryScan.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.currentScan = action.payload;
        const index = state.scanHistory.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.scanHistory[index] = action.payload;
        }
      })
      .addCase(retryScan.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      })
      // Fetch scan stats
      .addCase(fetchScanStats.fulfilled, (state, action) => {
        state.scanStats = action.payload;
      })
      // Provide feedback
      .addCase(provideScanFeedback.fulfilled, (state, action) => {
        const scan = state.scanHistory.find(s => s.id === action.meta.arg.scanId);
        if (scan) {
          scan.metadata = { ...scan.metadata, feedbackProvided: true };
        }
        if (state.currentScan?.id === action.meta.arg.scanId) {
          state.currentScan.metadata = { ...state.currentScan.metadata, feedbackProvided: true };
        }
>>>>>>> v.3.0
      });
  },
});

<<<<<<< HEAD
export const { setCurrentScan, clearError } = scanSlice.actions;
=======
export const {
  clearError,
  startScanSession,
  endScanSession,
  incrementRetryCount,
  updateScanInList,
} = scanSlice.actions;

>>>>>>> v.3.0
export default scanSlice.reducer;