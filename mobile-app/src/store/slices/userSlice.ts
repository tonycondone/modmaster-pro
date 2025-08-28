import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/apiService';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'private';
      showEmail: boolean;
      showPhone: boolean;
    };
  };
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchUserProfile = createAsyncThunk(
  'user/fetchUserProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get('/users/profile');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'user/updateUserProfile',
  async (data: Partial<UserProfile>, { rejectWithValue }) => {
    try {
      const response = await apiService.put('/users/profile', data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update profile');
    }
  }
);

export const updateUserPreferences = createAsyncThunk(
  'user/updateUserPreferences',
  async (preferences: UserProfile['preferences'], { rejectWithValue }) => {
    try {
      const response = await apiService.put('/users/preferences', preferences);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update preferences');
    }
  }
);

export const uploadAvatar = createAsyncThunk(
  'user/uploadAvatar',
  async (imageUri: string, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('avatar', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);
      
      const response = await apiService.post('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload avatar');
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update user profile
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update user preferences
      .addCase(updateUserPreferences.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserPreferences.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.profile) {
          state.profile.preferences = action.payload.preferences;
        }
      })
      .addCase(updateUserPreferences.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Upload avatar
      .addCase(uploadAvatar.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.profile) {
          state.profile.avatar = action.payload.avatar;
        }
      })
      .addCase(uploadAvatar.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = userSlice.actions;
export default userSlice.reducer;