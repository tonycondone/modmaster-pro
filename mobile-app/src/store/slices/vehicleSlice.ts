import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiService from '../../services/apiService';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  licensePlate?: string;
  color?: string;
  mileage: number;
  transmission?: string;
  fuelType?: string;
  engine?: {
    size?: string;
    cylinders?: number;
    horsepower?: number;
    torque?: number;
  };
  photos?: string[];
  purchaseDate?: string;
  purchasePrice?: number;
  insurance?: {
    provider?: string;
    policyNumber?: string;
    expiryDate?: string;
  };
  notes?: string;
  active: boolean;
  maintenanceCount?: number;
  lastMaintenanceAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface VehicleState {
  vehicles: Vehicle[];
  currentVehicle: Vehicle | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const initialState: VehicleState = {
  vehicles: [],
  currentVehicle: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
};

// Async thunks
export const fetchVehicles = createAsyncThunk(
  'vehicles/fetchVehicles',
  async (params: { page?: number; limit?: number; active?: boolean } = {}, { rejectWithValue }) => {
    try {
      const response = await apiService.getVehicles(params.page, params.limit);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const fetchVehicleById = createAsyncThunk(
  'vehicles/fetchVehicleById',
  async (vehicleId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getVehicleById(vehicleId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const createVehicle = createAsyncThunk(
  'vehicles/createVehicle',
  async (vehicleData: Partial<Vehicle>, { rejectWithValue }) => {
    try {
      const response = await apiService.createVehicle(vehicleData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const updateVehicle = createAsyncThunk(
  'vehicles/updateVehicle',
  async ({ id, data }: { id: string; data: Partial<Vehicle> }, { rejectWithValue }) => {
    try {
      const response = await apiService.updateVehicle(id, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const deleteVehicle = createAsyncThunk(
  'vehicles/deleteVehicle',
  async (vehicleId: string, { rejectWithValue }) => {
    try {
      await apiService.deleteVehicle(vehicleId);
      return vehicleId;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const addMaintenanceRecord = createAsyncThunk(
  'vehicles/addMaintenanceRecord',
  async ({ vehicleId, record }: { vehicleId: string; record: any }, { rejectWithValue }) => {
    try {
      const response = await apiService.addMaintenanceRecord(vehicleId, record);
      return { vehicleId, record: response.data };
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const getMaintenanceHistory = createAsyncThunk(
  'vehicles/getMaintenanceHistory',
  async (vehicleId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getMaintenanceHistory(vehicleId);
      return { vehicleId, history: response.data };
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const uploadVehiclePhoto = createAsyncThunk(
  'vehicles/uploadPhoto',
  async ({ vehicleId, photo }: { vehicleId: string; photo: any }, { rejectWithValue }) => {
    try {
      const response = await apiService.uploadVehiclePhoto(vehicleId, photo);
      return { vehicleId, photoUrl: response.data.url };
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

const vehicleSlice = createSlice({
  name: 'vehicles',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentVehicle: (state, action: PayloadAction<Vehicle | null>) => {
      state.currentVehicle = action.payload;
    },
    updateVehicleInList: (state, action: PayloadAction<Vehicle>) => {
      const index = state.vehicles.findIndex(v => v.id === action.payload.id);
      if (index !== -1) {
        state.vehicles[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch vehicles
      .addCase(fetchVehicles.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.vehicles = action.payload.vehicles;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch vehicle by ID
      .addCase(fetchVehicleById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVehicleById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentVehicle = action.payload;
      })
      .addCase(fetchVehicleById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create vehicle
      .addCase(createVehicle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createVehicle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.vehicles.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createVehicle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update vehicle
      .addCase(updateVehicle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateVehicle.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.vehicles.findIndex(v => v.id === action.payload.id);
        if (index !== -1) {
          state.vehicles[index] = action.payload;
        }
        if (state.currentVehicle?.id === action.payload.id) {
          state.currentVehicle = action.payload;
        }
      })
      .addCase(updateVehicle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete vehicle
      .addCase(deleteVehicle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.vehicles = state.vehicles.filter(v => v.id !== action.payload);
        if (state.currentVehicle?.id === action.payload) {
          state.currentVehicle = null;
        }
        state.pagination.total -= 1;
      })
      .addCase(deleteVehicle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Add maintenance record
      .addCase(addMaintenanceRecord.fulfilled, (state, action) => {
        const vehicle = state.vehicles.find(v => v.id === action.payload.vehicleId);
        if (vehicle) {
          vehicle.maintenanceCount = (vehicle.maintenanceCount || 0) + 1;
          vehicle.lastMaintenanceAt = new Date().toISOString();
        }
        if (state.currentVehicle?.id === action.payload.vehicleId) {
          state.currentVehicle.maintenanceCount = (state.currentVehicle.maintenanceCount || 0) + 1;
          state.currentVehicle.lastMaintenanceAt = new Date().toISOString();
        }
      })
      // Upload photo
      .addCase(uploadVehiclePhoto.fulfilled, (state, action) => {
        const vehicle = state.vehicles.find(v => v.id === action.payload.vehicleId);
        if (vehicle) {
          if (!vehicle.photos) vehicle.photos = [];
          vehicle.photos.push(action.payload.photoUrl);
        }
        if (state.currentVehicle?.id === action.payload.vehicleId) {
          if (!state.currentVehicle.photos) state.currentVehicle.photos = [];
          state.currentVehicle.photos.push(action.payload.photoUrl);
        }
      });
  },
});

export const { clearError, setCurrentVehicle, updateVehicleInList } = vehicleSlice.actions;
export default vehicleSlice.reducer;