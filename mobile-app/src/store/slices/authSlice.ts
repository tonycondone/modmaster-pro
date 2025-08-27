import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api, handleApiError } from '../../services/api';

// Types
export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  role: 'user' | 'pro' | 'shop' | 'admin';
  subscriptionTier: 'free' | 'basic' | 'pro' | 'enterprise';
  isVerified: boolean;
  stats: {
    totalScans: number;
    totalProjects: number;
    totalVehicles: number;
    reputation: number;
  };
  preferences?: any;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
};

// Async thunks
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async () => {
    const token = await api.getAccessToken();
    if (token) {
      const response = await api.getMe();
      return response.user;
    }
    return null;
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const response = await api.login(email, password);
    return response.user;
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: {
    email: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => {
    const response = await api.register(data);
    return response.user;
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    await api.logout();
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data: Partial<User>) => {
    // API call to update profile
    // const response = await api.updateProfile(data);
    // return response.user;
    return { ...data }; // Mock for now
  }
);

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (token: string) => {
    await api.verifyEmail(token);
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string) => {
    await api.forgotPassword(email);
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }: { token: string; password: string }) => {
    await api.resetPassword(token, password);
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUserStats: (state, action: PayloadAction<Partial<User['stats']>>) => {
      if (state.user) {
        state.user.stats = {
          ...state.user.stats,
          ...action.payload,
        };
      }
    },
  },
  extraReducers: (builder) => {
    // Initialize auth
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        if (action.payload) {
          state.user = action.payload;
          state.isAuthenticated = true;
        }
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.error = handleApiError(action.error).message;
      });

    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = handleApiError(action.error).message;
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = handleApiError(action.error).message;
      });

    // Logout
    builder
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        // Still logout on error
        state.user = null;
        state.isAuthenticated = false;
      });

    // Update profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.user) {
          state.user = {
            ...state.user,
            ...action.payload,
          };
        }
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = handleApiError(action.error).message;
      });
  },
});

export const { clearError, updateUserStats } = authSlice.actions;
export default authSlice.reducer;