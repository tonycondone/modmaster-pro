import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api, handleApiError } from '../../services/api';

// Types
export interface IdentifiedPart {
  id: string;
  boundingBox: number[];
  confidence: number;
  partDetails?: {
    id: string;
    name: string;
    partNumber: string;
    manufacturer: string;
    category: string;
    price?: number;
    compatibility?: string;
  };
}

export interface Scan {
  id: string;
  userId: string;
  vehicleId: string;
  scanType: 'engine_bay' | 'exterior' | 'interior' | 'vin';
  imageUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  identifiedParts: IdentifiedPart[];
  aiAnalysisResults?: any;
  vinData?: {
    vin: string;
    make: string;
    model: string;
    year: number;
    engineType?: string;
  };
  feedback?: {
    accuracy: number;
    misidentifiedParts?: string[];
    missedParts?: string[];
    comments?: string;
  };
  error?: string;
  notes?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  processingStartedAt?: string;
  processingCompletedAt?: string;
}

export interface ScanState {
  scans: Scan[];
  currentScan: Scan | null;
  recentScans: Scan[];
  isLoading: boolean;
  isCreating: boolean;
  isProcessing: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  } | null;
  stats: {
    total: number;
    byType: Record<string, { count: number; successRate: number }>;
    last30Days: Array<{ date: string; count: number }>;
  } | null;
}

const initialState: ScanState = {
  scans: [],
  currentScan: null,
  recentScans: [],
  isLoading: false,
  isCreating: false,
  isProcessing: false,
  error: null,
  pagination: null,
  stats: null,
};

// Async thunks
export const createScan = createAsyncThunk(
  'scans/create',
  async ({ vehicleId, scanType, imageUri, notes }: {
    vehicleId: string;
    scanType: string;
    imageUri: string;
    notes?: string;
  }) => {
    const response = await api.createScan(vehicleId, scanType, imageUri, notes);
    return response;
  }
);

export const fetchMyScans = createAsyncThunk(
  'scans/fetchMy',
  async (params?: {
    vehicleId?: string;
    scanType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.getMyScans(params);
    return response;
  }
);

export const fetchScan = createAsyncThunk(
  'scans/fetchOne',
  async (id: string) => {
    const response = await api.getScan(id);
    return response;
  }
);

export const fetchScanStatus = createAsyncThunk(
  'scans/fetchStatus',
  async (id: string) => {
    const response = await api.getScanStatus(id);
    return response;
  }
);

export const retryScan = createAsyncThunk(
  'scans/retry',
  async (id: string) => {
    const response = await api.retryScan(id);
    return { id, ...response };
  }
);

export const submitScanFeedback = createAsyncThunk(
  'scans/submitFeedback',
  async ({ id, feedback }: {
    id: string;
    feedback: {
      accuracy: number;
      misidentifiedParts?: string[];
      missedParts?: string[];
      comments?: string;
    };
  }) => {
    await api.submitScanFeedback(id, feedback);
    return { id, feedback };
  }
);

export const fetchScanStats = createAsyncThunk(
  'scans/fetchStats',
  async () => {
    // This would be a real API call
    // const response = await api.getScanStats();
    // return response;
    
    // Mock data for now
    return {
      total: 42,
      byType: {
        engine_bay: { count: 20, successRate: 0.95 },
        exterior: { count: 12, successRate: 0.92 },
        interior: { count: 8, successRate: 0.88 },
        vin: { count: 2, successRate: 1.0 },
      },
      last30Days: [
        { date: '2024-01-01', count: 3 },
        { date: '2024-01-02', count: 2 },
        { date: '2024-01-03', count: 5 },
      ],
    };
  }
);

// Slice
const scanSlice = createSlice({
  name: 'scans',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentScan: (state, action: PayloadAction<Scan | null>) => {
      state.currentScan = action.payload;
    },
    updateScanStatus: (state, action: PayloadAction<{
      id: string;
      status: Scan['status'];
      progress?: number;
      error?: string;
    }>) => {
      const { id, status, progress, error } = action.payload;
      const scan = state.scans.find(s => s.id === id);
      if (scan) {
        scan.status = status;
        if (progress !== undefined) scan.progress = progress;
        if (error !== undefined) scan.error = error;
      }
      if (state.currentScan?.id === id) {
        state.currentScan.status = status;
        if (progress !== undefined) state.currentScan.progress = progress;
        if (error !== undefined) state.currentScan.error = error;
      }
    },
    updateScanResults: (state, action: PayloadAction<{
      id: string;
      identifiedParts: IdentifiedPart[];
      aiAnalysisResults?: any;
      vinData?: any;
    }>) => {
      const { id, ...results } = action.payload;
      const scan = state.scans.find(s => s.id === id);
      if (scan) {
        Object.assign(scan, results);
        scan.status = 'completed';
        scan.progress = 100;
      }
      if (state.currentScan?.id === id) {
        Object.assign(state.currentScan, results);
        state.currentScan.status = 'completed';
        state.currentScan.progress = 100;
      }
    },
  },
  extraReducers: (builder) => {
    // Create scan
    builder
      .addCase(createScan.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createScan.fulfilled, (state, action) => {
        state.isCreating = false;
        const newScan: Scan = {
          ...action.payload,
          identifiedParts: [],
          progress: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.scans.unshift(newScan);
        state.currentScan = newScan;
      })
      .addCase(createScan.rejected, (state, action) => {
        state.isCreating = false;
        state.error = handleApiError(action.error).message;
      });

    // Fetch my scans
    builder
      .addCase(fetchMyScans.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyScans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.scans = action.payload.data || [];
        state.pagination = action.payload.pagination || null;
        // Update recent scans
        state.recentScans = state.scans.slice(0, 5);
      })
      .addCase(fetchMyScans.rejected, (state, action) => {
        state.isLoading = false;
        state.error = handleApiError(action.error).message;
      });

    // Fetch single scan
    builder
      .addCase(fetchScan.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchScan.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentScan = action.payload;
        // Update in list if exists
        const index = state.scans.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.scans[index] = action.payload;
        }
      })
      .addCase(fetchScan.rejected, (state, action) => {
        state.isLoading = false;
        state.error = handleApiError(action.error).message;
      });

    // Fetch scan status
    builder
      .addCase(fetchScanStatus.fulfilled, (state, action) => {
        const { scanId, status, progress } = action.payload;
        const scan = state.scans.find(s => s.id === scanId);
        if (scan) {
          scan.status = status;
          scan.progress = progress || 0;
        }
        if (state.currentScan?.id === scanId) {
          state.currentScan.status = status;
          state.currentScan.progress = progress || 0;
        }
      });

    // Retry scan
    builder
      .addCase(retryScan.pending, (state) => {
        state.isProcessing = true;
      })
      .addCase(retryScan.fulfilled, (state, action) => {
        state.isProcessing = false;
        const { id, status } = action.payload;
        const scan = state.scans.find(s => s.id === id);
        if (scan) {
          scan.status = status;
          scan.progress = 0;
          scan.error = undefined;
        }
        if (state.currentScan?.id === id) {
          state.currentScan.status = status;
          state.currentScan.progress = 0;
          state.currentScan.error = undefined;
        }
      })
      .addCase(retryScan.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = handleApiError(action.error).message;
      });

    // Submit feedback
    builder
      .addCase(submitScanFeedback.fulfilled, (state, action) => {
        const { id, feedback } = action.payload;
        const scan = state.scans.find(s => s.id === id);
        if (scan) {
          scan.feedback = feedback;
        }
        if (state.currentScan?.id === id) {
          state.currentScan.feedback = feedback;
        }
      });

    // Fetch stats
    builder
      .addCase(fetchScanStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export const {
  clearError,
  setCurrentScan,
  updateScanStatus,
  updateScanResults,
} = scanSlice.actions;

export default scanSlice.reducer;