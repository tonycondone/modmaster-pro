import { createSlice } from '@reduxjs/toolkit';

interface ScanState {
  currentScan: any | null;
  recentScans: any[];
  isProcessing: boolean;
}

const initialState: ScanState = {
  currentScan: null,
  recentScans: [],
  isProcessing: false,
};

const scanSlice = createSlice({
  name: 'scans',
  initialState,
  reducers: {
    setScanProcessing: (state, action) => {
      state.isProcessing = action.payload;
    },
    setCurrentScan: (state, action) => {
      state.currentScan = action.payload;
    },
  },
});

export const { setScanProcessing, setCurrentScan } = scanSlice.actions;
export default scanSlice.reducer;