import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/apiService';

export interface Part {
  id: string;
  name: string;
  description: string;
  partNumber: string;
  category: string;
  brand: string;
  price: number;
  currency: string;
  condition: 'new' | 'used' | 'refurbished';
  images: string[];
  compatibility: string[];
  sellerId: string;
  sellerName: string;
  rating: number;
  reviewCount: number;
  stockQuantity: number;
  location: string;
  shippingCost: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PartState {
  parts: Part[];
  currentPart: Part | null;
  filters: {
    category?: string;
    brand?: string;
    priceRange?: { min: number; max: number };
    condition?: string;
    location?: string;
  };
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const initialState: PartState = {
  parts: [],
  currentPart: null,
  filters: {},
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true,
  },
};

// Async thunks
export const fetchParts = createAsyncThunk(
  'parts/fetchParts',
  async (params: { page?: number; filters?: any } = {}, { rejectWithValue }) => {
    try {
      const response = await apiService.get('/parts', { params });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch parts');
    }
  }
);

export const fetchPartById = createAsyncThunk(
  'parts/fetchPartById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/parts/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch part');
    }
  }
);

export const searchParts = createAsyncThunk(
  'parts/searchParts',
  async (query: string, { rejectWithValue }) => {
    try {
      const response = await apiService.get('/parts/search', { params: { q: query } });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Search failed');
    }
  }
);

const partSlice = createSlice({
  name: 'parts',
  initialState,
  reducers: {
    setCurrentPart: (state, action: PayloadAction<Part | null>) => {
      state.currentPart = action.payload;
    },
    setFilters: (state, action: PayloadAction<any>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // Reset to first page when filters change
    },
    clearFilters: (state) => {
      state.filters = {};
      state.pagination.page = 1;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch parts
      .addCase(fetchParts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchParts.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.page === 1) {
          state.parts = action.payload.parts;
        } else {
          state.parts = [...state.parts, ...action.payload.parts];
        }
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          hasMore: action.payload.hasMore,
        };
      })
      .addCase(fetchParts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch part by ID
      .addCase(fetchPartById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPartById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentPart = action.payload;
      })
      .addCase(fetchPartById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Search parts
      .addCase(searchParts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchParts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.parts = action.payload.parts;
        state.pagination = {
          page: 1,
          limit: action.payload.limit,
          total: action.payload.total,
          hasMore: action.payload.hasMore,
        };
      })
      .addCase(searchParts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentPart, setFilters, clearFilters, clearError } = partSlice.actions;
export default partSlice.reducer;