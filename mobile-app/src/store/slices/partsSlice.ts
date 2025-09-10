import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiService from '../../services/apiService';

export interface Part {
  id: string;
  name: string;
  description: string;
  brand: string;
  partNumber: string;
  category: string;
  subCategory?: string;
  condition: 'new' | 'used' | 'refurbished';
  price: number;
  oldPrice?: number;
  discount?: number;
  images: string[];
  availability: 'in_stock' | 'out_of_stock' | 'limited';
  stockCount?: number;
  specifications?: Record<string, any>;
  compatibility?: {
    makes: string[];
    models: string[];
    years: number[];
  };
  seller: {
    id: string;
    name: string;
    rating: number;
    reviewCount: number;
  };
  rating: number;
  reviewCount: number;
  warranty?: {
    duration: string;
    type: string;
  };
  shipping?: {
    free: boolean;
    estimatedDays: number;
    cost?: number;
  };
  isFeatured?: boolean;
  isBestseller?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  partId: string;
  part: Part;
  quantity: number;
  selectedOptions?: Record<string, any>;
}

export interface PartReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  photos?: string[];
  verified: boolean;
  helpful: number;
  createdAt: string;
}

interface PartsState {
  parts: Part[];
  featuredParts: Part[];
  currentPart: Part | null;
  searchResults: Part[];
  categories: Array<{ id: string; name: string; icon: string; count: number }>;
  filters: {
    category?: string;
    brand?: string[];
    priceRange?: { min: number; max: number };
    condition?: string[];
    availability?: string[];
    rating?: number;
  };
  sortBy: 'price_low' | 'price_high' | 'rating' | 'newest' | 'popularity';
  isLoading: boolean;
  searchLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  reviews: {
    [partId: string]: PartReview[];
  };
}

const initialState: PartsState = {
  parts: [],
  featuredParts: [],
  currentPart: null,
  searchResults: [],
  categories: [],
  filters: {},
  sortBy: 'popularity',
  isLoading: false,
  searchLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  reviews: {},
};

// Async thunks
export const fetchParts = createAsyncThunk(
  'parts/fetchParts',
  async (params: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    filters?: any;
    sortBy?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await apiService.getParts(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const fetchFeaturedParts = createAsyncThunk(
  'parts/fetchFeaturedParts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getFeaturedParts();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const fetchPartById = createAsyncThunk(
  'parts/fetchPartById',
  async (partId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getPartById(partId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const searchParts = createAsyncThunk(
  'parts/searchParts',
  async (query: string, { rejectWithValue }) => {
    try {
      const response = await apiService.searchParts(query);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'parts/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getPartCategories();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const fetchPartReviews = createAsyncThunk(
  'parts/fetchPartReviews',
  async ({ partId, page = 1 }: { partId: string; page?: number }, { rejectWithValue }) => {
    try {
      const response = await apiService.getPartReviews(partId, page);
      return { partId, reviews: response.data.reviews };
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const addPartReview = createAsyncThunk(
  'parts/addPartReview',
  async ({ partId, review }: { partId: string; review: Partial<PartReview> }, { rejectWithValue }) => {
    try {
      const response = await apiService.addPartReview(partId, review);
      return { partId, review: response.data };
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const checkPartCompatibility = createAsyncThunk(
  'parts/checkCompatibility',
  async ({ partId, vehicleId }: { partId: string; vehicleId: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.checkPartCompatibility(partId, vehicleId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

const partsSlice = createSlice({
  name: 'parts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<typeof initialState.filters>) => {
      state.filters = action.payload;
      state.pagination.page = 1; // Reset to first page when filters change
    },
    setSortBy: (state, action: PayloadAction<typeof initialState.sortBy>) => {
      state.sortBy = action.payload;
      state.pagination.page = 1; // Reset to first page when sort changes
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    updatePartInList: (state, action: PayloadAction<Part>) => {
      const index = state.parts.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.parts[index] = action.payload;
      }
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
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchParts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch featured parts
      .addCase(fetchFeaturedParts.fulfilled, (state, action) => {
        state.featuredParts = action.payload;
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
        state.searchLoading = true;
        state.error = null;
      })
      .addCase(searchParts.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload.parts;
      })
      .addCase(searchParts.rejected, (state, action) => {
        state.searchLoading = false;
        state.error = action.payload as string;
      })
      // Fetch categories
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })
      // Fetch reviews
      .addCase(fetchPartReviews.fulfilled, (state, action) => {
        state.reviews[action.payload.partId] = action.payload.reviews;
      })
      // Add review
      .addCase(addPartReview.fulfilled, (state, action) => {
        if (!state.reviews[action.payload.partId]) {
          state.reviews[action.payload.partId] = [];
        }
        state.reviews[action.payload.partId].unshift(action.payload.review);
        
        // Update review count and rating on the part
        const part = state.parts.find(p => p.id === action.payload.partId);
        if (part) {
          part.reviewCount += 1;
          // Recalculate average rating (simplified)
          part.rating = ((part.rating * (part.reviewCount - 1)) + action.payload.review.rating) / part.reviewCount;
        }
        
        if (state.currentPart?.id === action.payload.partId) {
          state.currentPart.reviewCount += 1;
          state.currentPart.rating = ((state.currentPart.rating * (state.currentPart.reviewCount - 1)) + action.payload.review.rating) / state.currentPart.reviewCount;
        }
      });
  },
});

export const {
  clearError,
  setFilters,
  setSortBy,
  clearSearchResults,
  updatePartInList,
} = partsSlice.actions;

export default partsSlice.reducer;