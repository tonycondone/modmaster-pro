import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
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
  createdAt: string;
  updatedAt: string;
}

export interface VehicleState {
  vehicles: Vehicle[];
  currentVehicle: Vehicle | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: VehicleState = {
  vehicles: [],
  currentVehicle: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchVehicles = createAsyncThunk(
  'vehicles/fetchVehicles',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get('/vehicles');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch vehicles');
    }
  }
);

export const addVehicle = createAsyncThunk(
  'vehicles/addVehicle',
  async (vehicleData: Partial<Vehicle>, { rejectWithValue }) => {
    try {
      const response = await apiService.post('/vehicles', vehicleData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add vehicle');
    }
  }
);

export const updateVehicle = createAsyncThunk(
  'vehicles/updateVehicle',
  async ({ id, data }: { id: string; data: Partial<Vehicle> }, { rejectWithValue }) => {
    try {
      const response = await apiService.put(`/vehicles/${id}`, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update vehicle');
    }
  }
);

export const deleteVehicle = createAsyncThunk(
  'vehicles/deleteVehicle',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiService.delete(`/vehicles/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete vehicle');
    }
  }
);

const vehicleSlice = createSlice({
  name: 'vehicles',
  initialState,
  reducers: {
    setCurrentVehicle: (state, action: PayloadAction<Vehicle | null>) => {
      state.currentVehicle = action.payload;
    },
    clearError: (state) => {
      state.error = null;
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
        state.vehicles = action.payload;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
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
      })
      .addCase(deleteVehicle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentVehicle, clearError } = vehicleSlice.actions;
export default vehicleSlice.reducer;