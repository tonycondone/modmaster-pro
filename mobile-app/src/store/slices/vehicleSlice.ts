import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
<<<<<<< HEAD
import { apiService } from '@/services/apiService';

export interface Vehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  licensePlate?: string;
  color?: string;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
  engineSize?: string;
  isActive: boolean;
=======
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
>>>>>>> v.3.0
  createdAt: string;
  updatedAt: string;
}

<<<<<<< HEAD
export interface VehicleState {
=======
interface VehicleState {
>>>>>>> v.3.0
  vehicles: Vehicle[];
  currentVehicle: Vehicle | null;
  isLoading: boolean;
  error: string | null;
<<<<<<< HEAD
=======
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
>>>>>>> v.3.0
}

const initialState: VehicleState = {
  vehicles: [],
  currentVehicle: null,
  isLoading: false,
  error: null,
<<<<<<< HEAD
=======
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
>>>>>>> v.3.0
};

// Async thunks
export const fetchVehicles = createAsyncThunk(
  'vehicles/fetchVehicles',
<<<<<<< HEAD
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get('/vehicles');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch vehicles');
=======
  async (params: { page?: number; limit?: number; active?: boolean } = {}, { rejectWithValue }) => {
    try {
      const response = await apiService.getVehicles(params.page, params.limit);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
>>>>>>> v.3.0
    }
  }
);

<<<<<<< HEAD
export const addVehicle = createAsyncThunk(
  'vehicles/addVehicle',
  async (vehicleData: Partial<Vehicle>, { rejectWithValue }) => {
    try {
      const response = await apiService.post('/vehicles', vehicleData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add vehicle');
=======
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
>>>>>>> v.3.0
    }
  }
);

export const updateVehicle = createAsyncThunk(
  'vehicles/updateVehicle',
  async ({ id, data }: { id: string; data: Partial<Vehicle> }, { rejectWithValue }) => {
    try {
<<<<<<< HEAD
      const response = await apiService.put(`/vehicles/${id}`, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update vehicle');
=======
      const response = await apiService.updateVehicle(id, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
>>>>>>> v.3.0
    }
  }
);

export const deleteVehicle = createAsyncThunk(
  'vehicles/deleteVehicle',
<<<<<<< HEAD
  async (id: string, { rejectWithValue }) => {
    try {
      await apiService.delete(`/vehicles/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete vehicle');
=======
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
>>>>>>> v.3.0
    }
  }
);

const vehicleSlice = createSlice({
  name: 'vehicles',
  initialState,
  reducers: {
<<<<<<< HEAD
    setCurrentVehicle: (state, action: PayloadAction<Vehicle | null>) => {
      state.currentVehicle = action.payload;
    },
    clearError: (state) => {
      state.error = null;
=======
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
>>>>>>> v.3.0
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
<<<<<<< HEAD
        state.vehicles = action.payload;
=======
        state.vehicles = action.payload.vehicles;
        state.pagination = action.payload.pagination;
>>>>>>> v.3.0
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
<<<<<<< HEAD
      // Add vehicle
      .addCase(addVehicle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addVehicle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.vehicles.push(action.payload);
      })
      .addCase(addVehicle.rejected, (state, action) => {
=======
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
>>>>>>> v.3.0
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
<<<<<<< HEAD
=======
        state.pagination.total -= 1;
>>>>>>> v.3.0
      })
      .addCase(deleteVehicle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
<<<<<<< HEAD
=======
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
>>>>>>> v.3.0
      });
  },
});

<<<<<<< HEAD
export const { setCurrentVehicle, clearError } = vehicleSlice.actions;
=======
export const { clearError, setCurrentVehicle, updateVehicleInList } = vehicleSlice.actions;
>>>>>>> v.3.0
export default vehicleSlice.reducer;