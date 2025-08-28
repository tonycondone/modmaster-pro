import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/apiService';

export interface Scan {
  id: string;
  userId: string;
  vehicleId?: string;
  imageUrl: string;
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
  createdAt: string;
  updatedAt: string;
}

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
    }
  }
);

export const fetchScans = createAsyncThunk(
  'scans/fetchScans',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get('/scans');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch scans');
    }
  }
);

export const getScanById = createAsyncThunk(
  'scans/getScanById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/scans/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get scan');
    }
  }
);

const scanSlice = createSlice({
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
      });
  },
});

export const { setCurrentScan, clearError } = scanSlice.actions;
export default scanSlice.reducer;