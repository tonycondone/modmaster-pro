import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  nickname?: string;
  vin?: string;
  mileage?: number;
  images: string[];
}

interface VehicleState {
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

export const fetchVehicles = createAsyncThunk(
  'vehicles/fetchAll',
  async () => {
    const response = await api.getMyVehicles();
    return response.data;
  }
);

export const createVehicle = createAsyncThunk(
  'vehicles/create',
  async (vehicleData: any) => {
    const response = await api.createVehicle(vehicleData);
    return response.data;
  }
);

const vehicleSlice = createSlice({
  name: 'vehicles',
  initialState,
  reducers: {
    setCurrentVehicle: (state, action) => {
      state.currentVehicle = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVehicles.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.vehicles = action.payload;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch vehicles';
      });
  },
});

export const { setCurrentVehicle } = vehicleSlice.actions;
export default vehicleSlice.reducer;