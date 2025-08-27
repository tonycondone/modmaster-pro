import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api, handleApiError } from '../../services/api';

// Types
export interface Vehicle {
  id: string;
  userId: string;
  vin?: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  engineType?: string;
  engineDisplacement?: number;
  transmission?: string;
  drivetrain?: 'FWD' | 'RWD' | 'AWD' | '4WD';
  bodyStyle?: string;
  exteriorColor?: string;
  interiorColor?: string;
  mileage?: number;
  licensePlate?: string;
  nickname?: string;
  description?: string;
  images: string[];
  specifications: any;
  modifications: any[];
  maintenanceHistory: any[];
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  totalInvested: number;
  isPrimary: boolean;
  isPublic: boolean;
  viewsCount: number;
  likesCount: number;
  performanceData: any;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleState {
  vehicles: Vehicle[];
  currentVehicle: Vehicle | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  } | null;
}

const initialState: VehicleState = {
  vehicles: [],
  currentVehicle: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  pagination: null,
};

// Async thunks
export const fetchMyVehicles = createAsyncThunk(
  'vehicles/fetchMy',
  async (params?: { page?: number; limit?: number; sort?: string }) => {
    const response = await api.getMyVehicles(params);
    return response;
  }
);

export const fetchVehicle = createAsyncThunk(
  'vehicles/fetchOne',
  async (id: string) => {
    const response = await api.getVehicle(id);
    return response.vehicle;
  }
);

export const createVehicle = createAsyncThunk(
  'vehicles/create',
  async (data: {
    vin?: string;
    make: string;
    model: string;
    year: number;
    trim?: string;
    engineType?: string;
    mileage?: number;
    nickname?: string;
    isPrimary?: boolean;
  }) => {
    const response = await api.createVehicle(data);
    return response;
  }
);

export const updateVehicle = createAsyncThunk(
  'vehicles/update',
  async ({ id, data }: { id: string; data: Partial<Vehicle> }) => {
    const response = await api.updateVehicle(id, data);
    return response;
  }
);

export const deleteVehicle = createAsyncThunk(
  'vehicles/delete',
  async (id: string) => {
    await api.deleteVehicle(id);
    return id;
  }
);

export const addModification = createAsyncThunk(
  'vehicles/addModification',
  async ({ vehicleId, modification }: { vehicleId: string; modification: any }) => {
    const response = await api.addModification(vehicleId, modification);
    return { vehicleId, vehicle: response };
  }
);

export const uploadVehicleImages = createAsyncThunk(
  'vehicles/uploadImages',
  async ({ vehicleId, images }: { vehicleId: string; images: any[] }) => {
    const response = await api.uploadVehicleImages(vehicleId, images);
    return { vehicleId, images: response.images };
  }
);

// Slice
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
    setPrimaryVehicle: (state, action: PayloadAction<string>) => {
      state.vehicles = state.vehicles.map(vehicle => ({
        ...vehicle,
        isPrimary: vehicle.id === action.payload,
      }));
    },
  },
  extraReducers: (builder) => {
    // Fetch my vehicles
    builder
      .addCase(fetchMyVehicles.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyVehicles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.vehicles = action.payload.data || [];
        state.pagination = action.payload.pagination || null;
      })
      .addCase(fetchMyVehicles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = handleApiError(action.error).message;
      });

    // Fetch single vehicle
    builder
      .addCase(fetchVehicle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVehicle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentVehicle = action.payload;
      })
      .addCase(fetchVehicle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = handleApiError(action.error).message;
      });

    // Create vehicle
    builder
      .addCase(createVehicle.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createVehicle.fulfilled, (state, action) => {
        state.isCreating = false;
        state.vehicles.unshift(action.payload);
        if (action.payload.isPrimary) {
          state.vehicles = state.vehicles.map(vehicle => ({
            ...vehicle,
            isPrimary: vehicle.id === action.payload.id,
          }));
        }
      })
      .addCase(createVehicle.rejected, (state, action) => {
        state.isCreating = false;
        state.error = handleApiError(action.error).message;
      });

    // Update vehicle
    builder
      .addCase(updateVehicle.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateVehicle.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.vehicles.findIndex(v => v.id === action.payload.id);
        if (index !== -1) {
          state.vehicles[index] = action.payload;
        }
        if (state.currentVehicle?.id === action.payload.id) {
          state.currentVehicle = action.payload;
        }
        if (action.payload.isPrimary) {
          state.vehicles = state.vehicles.map(vehicle => ({
            ...vehicle,
            isPrimary: vehicle.id === action.payload.id,
          }));
        }
      })
      .addCase(updateVehicle.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = handleApiError(action.error).message;
      });

    // Delete vehicle
    builder
      .addCase(deleteVehicle.pending, (state) => {
        state.isDeleting = true;
        state.error = null;
      })
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.isDeleting = false;
        state.vehicles = state.vehicles.filter(v => v.id !== action.payload);
        if (state.currentVehicle?.id === action.payload) {
          state.currentVehicle = null;
        }
      })
      .addCase(deleteVehicle.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = handleApiError(action.error).message;
      });

    // Add modification
    builder
      .addCase(addModification.fulfilled, (state, action) => {
        const { vehicleId, vehicle } = action.payload;
        const index = state.vehicles.findIndex(v => v.id === vehicleId);
        if (index !== -1) {
          state.vehicles[index] = vehicle;
        }
        if (state.currentVehicle?.id === vehicleId) {
          state.currentVehicle = vehicle;
        }
      });

    // Upload images
    builder
      .addCase(uploadVehicleImages.fulfilled, (state, action) => {
        const { vehicleId, images } = action.payload;
        const vehicle = state.vehicles.find(v => v.id === vehicleId);
        if (vehicle) {
          vehicle.images = [...vehicle.images, ...images];
        }
        if (state.currentVehicle?.id === vehicleId) {
          state.currentVehicle.images = [...state.currentVehicle.images, ...images];
        }
      });
  },
});

export const { clearError, setCurrentVehicle, setPrimaryVehicle } = vehicleSlice.actions;
export default vehicleSlice.reducer;