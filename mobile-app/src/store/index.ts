import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import vehicleReducer from './slices/vehicleSlice';
<<<<<<< HEAD
import partReducer from './slices/partSlice';
=======
import partsReducer from './slices/partsSlice';
>>>>>>> v.3.0
import scanReducer from './slices/scanSlice';
import cartReducer from './slices/cartSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    vehicles: vehicleReducer,
<<<<<<< HEAD
    parts: partReducer,
    scans: scanReducer,
=======
    parts: partsReducer,
    scan: scanReducer,
>>>>>>> v.3.0
    cart: cartReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
<<<<<<< HEAD
        ignoredActions: ['persist/PERSIST'],
=======
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates'],
>>>>>>> v.3.0
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;