import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiService from '../../services/apiService';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  avatar?: string;
  bio?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      marketing: boolean;
      maintenance: boolean;
      orders: boolean;
      priceAlerts: boolean;
    };
    units: 'metric' | 'imperial';
    language: string;
    theme: 'light' | 'dark' | 'auto';
    currency: string;
  };
  stats: {
    vehicleCount: number;
    scanCount: number;
    orderCount: number;
    reviewCount: number;
    memberSince: string;
    lastActive: string;
  };
  subscription?: {
    plan: 'free' | 'basic' | 'premium';
    status: 'active' | 'expired' | 'cancelled';
    expiresAt?: string;
    features: string[];
  };
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
  }>;
  addresses: Array<{
    id: string;
    type: 'shipping' | 'billing';
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
    isDefault: boolean;
  }>;
  paymentMethods: Array<{
    id: string;
    type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
    isDefault: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'maintenance' | 'order' | 'scan';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

export interface Activity {
  id: string;
  type: 'vehicle_added' | 'scan_completed' | 'order_placed' | 'review_posted' | 'maintenance_completed';
  title: string;
  description: string;
  data?: any;
  timestamp: string;
}

interface UserState {
  profile: UserProfile | null;
  notifications: Notification[];
  activities: Activity[];
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  notificationCount: number;
  hasCompletedOnboarding: boolean;
}

const initialState: UserState = {
  profile: null,
  notifications: [],
  activities: [],
  isLoading: false,
  isUpdating: false,
  error: null,
  notificationCount: 0,
  hasCompletedOnboarding: false,
};

// Async thunks
export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getUserProfile();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'user/updateProfile',
  async (updates: Partial<UserProfile>, { rejectWithValue }) => {
    try {
      const response = await apiService.updateUserProfile(updates);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const uploadAvatar = createAsyncThunk(
  'user/uploadAvatar',
  async (imageData: string | FormData, { rejectWithValue }) => {
    try {
      const response = await apiService.uploadAvatar(imageData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const updatePreferences = createAsyncThunk(
  'user/updatePreferences',
  async (preferences: Partial<UserProfile['preferences']>, { rejectWithValue }) => {
    try {
      const response = await apiService.updateUserPreferences(preferences);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const fetchNotifications = createAsyncThunk(
  'user/fetchNotifications',
  async (params: { page?: number; limit?: number; unreadOnly?: boolean } = {}, { rejectWithValue }) => {
    try {
      const response = await apiService.getNotifications(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  'user/markNotificationAsRead',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      await apiService.markNotificationAsRead(notificationId);
      return notificationId;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const markAllNotificationsAsRead = createAsyncThunk(
  'user/markAllNotificationsAsRead',
  async (_, { rejectWithValue }) => {
    try {
      await apiService.markAllNotificationsAsRead();
      return true;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'user/deleteNotification',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      await apiService.deleteNotification(notificationId);
      return notificationId;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const fetchActivities = createAsyncThunk(
  'user/fetchActivities',
  async (params: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await apiService.getUserActivities(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const addAddress = createAsyncThunk(
  'user/addAddress',
  async (address: Partial<UserProfile['addresses'][0]>, { rejectWithValue }) => {
    try {
      const response = await apiService.addAddress(address);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const updateAddress = createAsyncThunk(
  'user/updateAddress',
  async ({ id, updates }: { id: string; updates: Partial<UserProfile['addresses'][0]> }, { rejectWithValue }) => {
    try {
      const response = await apiService.updateAddress(id, updates);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const deleteAddress = createAsyncThunk(
  'user/deleteAddress',
  async (addressId: string, { rejectWithValue }) => {
    try {
      await apiService.deleteAddress(addressId);
      return addressId;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const upgradeSubscription = createAsyncThunk(
  'user/upgradeSubscription',
  async (plan: 'basic' | 'premium', { rejectWithValue }) => {
    try {
      const response = await apiService.upgradeSubscription(plan);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
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
    setHasCompletedOnboarding: (state, action: PayloadAction<boolean>) => {
      state.hasCompletedOnboarding = action.payload;
    },
    updateNotificationCount: (state, action: PayloadAction<number>) => {
      state.notificationCount = action.payload;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.notificationCount += 1;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch profile
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
      // Update profile
      .addCase(updateUserProfile.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isUpdating = false;
        state.profile = action.payload;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      // Upload avatar
      .addCase(uploadAvatar.pending, (state) => {
        state.isUpdating = true;
      })
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        state.isUpdating = false;
        if (state.profile) {
          state.profile.avatar = action.payload.avatarUrl;
        }
      })
      .addCase(uploadAvatar.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      // Update preferences
      .addCase(updatePreferences.fulfilled, (state, action) => {
        if (state.profile) {
          state.profile.preferences = action.payload.preferences;
        }
      })
      // Fetch notifications
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        if (action.meta.arg.page === 1 || !action.meta.arg.page) {
          state.notifications = action.payload.notifications;
        } else {
          state.notifications = [...state.notifications, ...action.payload.notifications];
        }
        state.notificationCount = action.payload.unreadCount;
      })
      // Mark notification as read
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification && !notification.read) {
          notification.read = true;
          state.notificationCount = Math.max(0, state.notificationCount - 1);
        }
      })
      // Mark all as read
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.notifications.forEach(n => n.read = true);
        state.notificationCount = 0;
      })
      // Delete notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload);
        state.notifications = state.notifications.filter(n => n.id !== action.payload);
        if (notification && !notification.read) {
          state.notificationCount = Math.max(0, state.notificationCount - 1);
        }
      })
      // Fetch activities
      .addCase(fetchActivities.fulfilled, (state, action) => {
        if (action.meta.arg.page === 1 || !action.meta.arg.page) {
          state.activities = action.payload.activities;
        } else {
          state.activities = [...state.activities, ...action.payload.activities];
        }
      })
      // Add address
      .addCase(addAddress.fulfilled, (state, action) => {
        if (state.profile) {
          state.profile.addresses.push(action.payload);
        }
      })
      // Update address
      .addCase(updateAddress.fulfilled, (state, action) => {
        if (state.profile) {
          const index = state.profile.addresses.findIndex(a => a.id === action.payload.id);
          if (index !== -1) {
            state.profile.addresses[index] = action.payload;
          }
        }
      })
      // Delete address
      .addCase(deleteAddress.fulfilled, (state, action) => {
        if (state.profile) {
          state.profile.addresses = state.profile.addresses.filter(a => a.id !== action.payload);
        }
      })
      // Upgrade subscription
      .addCase(upgradeSubscription.fulfilled, (state, action) => {
        if (state.profile) {
          state.profile.subscription = action.payload.subscription;
        }
      });
  },
});

export const {
  clearError,
  setHasCompletedOnboarding,
  updateNotificationCount,
  addNotification,
} = userSlice.actions;

export default userSlice.reducer;