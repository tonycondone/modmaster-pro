import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
<<<<<<< HEAD
import { apiService } from '@/services/apiService';
=======
import apiService from '../../services/apiService';
import { Part } from './partsSlice';
>>>>>>> v.3.0

export interface CartItem {
  id: string;
  partId: string;
<<<<<<< HEAD
  partName: string;
  partImage: string;
  price: number;
  quantity: number;
  sellerId: string;
  sellerName: string;
}

export interface CartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;
=======
  part: Part;
  quantity: number;
  selectedOptions?: {
    color?: string;
    size?: string;
    warranty?: string;
    [key: string]: any;
  };
  notes?: string;
  addedAt: string;
  updatedAt: string;
}

export interface ShippingAddress {
  id?: string;
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault?: boolean;
}

export interface PaymentMethod {
  id?: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
}

export interface OrderSummary {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
}

export interface PromoCode {
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  description?: string;
}

interface CartState {
  items: CartItem[];
  savedForLater: CartItem[];
  shippingAddress: ShippingAddress | null;
  paymentMethod: PaymentMethod | null;
  orderSummary: OrderSummary;
  promoCode: PromoCode | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastSyncedAt: string | null;
>>>>>>> v.3.0
}

const initialState: CartState = {
  items: [],
<<<<<<< HEAD
  isLoading: false,
  error: null,
};

// Async thunks
=======
  savedForLater: [],
  shippingAddress: null,
  paymentMethod: null,
  orderSummary: {
    subtotal: 0,
    shipping: 0,
    tax: 0,
    discount: 0,
    total: 0,
    currency: 'USD',
  },
  promoCode: null,
  isLoading: false,
  isSyncing: false,
  error: null,
  lastSyncedAt: null,
};

// Helper function to calculate order summary
const calculateOrderSummary = (items: CartItem[], shipping: number = 0, promoCode: PromoCode | null = null): OrderSummary => {
  const subtotal = items.reduce((sum, item) => sum + (item.part.price * item.quantity), 0);
  let discount = 0;
  
  if (promoCode) {
    discount = promoCode.type === 'percentage' 
      ? subtotal * (promoCode.discount / 100)
      : promoCode.discount;
  }
  
  const tax = (subtotal - discount) * 0.08; // 8% tax rate
  const total = subtotal + shipping + tax - discount;
  
  return {
    subtotal,
    shipping,
    tax,
    discount,
    total,
    currency: 'USD',
  };
};

// Async thunks
export const syncCart = createAsyncThunk(
  'cart/syncCart',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const localCart = state.cart.items;
      const response = await apiService.syncCart(localCart);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

>>>>>>> v.3.0
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
<<<<<<< HEAD
      const response = await apiService.get('/cart');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch cart');
=======
      const response = await apiService.getCart();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
>>>>>>> v.3.0
    }
  }
);

export const addToCart = createAsyncThunk(
  'cart/addToCart',
<<<<<<< HEAD
  async (data: { partId: string; quantity: number }, { rejectWithValue }) => {
    try {
      const response = await apiService.post('/cart/items', data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add to cart');
=======
  async ({ partId, quantity = 1, options }: { partId: string; quantity?: number; options?: any }, { rejectWithValue }) => {
    try {
      const response = await apiService.addToCart(partId, quantity, options);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
>>>>>>> v.3.0
    }
  }
);

export const updateCartItem = createAsyncThunk(
  'cart/updateCartItem',
<<<<<<< HEAD
  async ({ id, quantity }: { id: string; quantity: number }, { rejectWithValue }) => {
    try {
      const response = await apiService.put(`/cart/items/${id}`, { quantity });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update cart item');
=======
  async ({ itemId, quantity, options }: { itemId: string; quantity?: number; options?: any }, { rejectWithValue }) => {
    try {
      const response = await apiService.updateCartItem(itemId, { quantity, options });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
>>>>>>> v.3.0
    }
  }
);

export const removeFromCart = createAsyncThunk(
  'cart/removeFromCart',
<<<<<<< HEAD
  async (id: string, { rejectWithValue }) => {
    try {
      await apiService.delete(`/cart/items/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove from cart');
=======
  async (itemId: string, { rejectWithValue }) => {
    try {
      await apiService.removeFromCart(itemId);
      return itemId;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const moveToSavedForLater = createAsyncThunk(
  'cart/moveToSavedForLater',
  async (itemId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.moveToSavedForLater(itemId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const moveToCart = createAsyncThunk(
  'cart/moveToCart',
  async (itemId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.moveToCart(itemId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
    }
  }
);

export const applyPromoCode = createAsyncThunk(
  'cart/applyPromoCode',
  async (code: string, { rejectWithValue }) => {
    try {
      const response = await apiService.applyPromoCode(code);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
>>>>>>> v.3.0
    }
  }
);

export const clearCart = createAsyncThunk(
  'cart/clearCart',
  async (_, { rejectWithValue }) => {
    try {
<<<<<<< HEAD
      await apiService.delete('/cart');
      return null;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to clear cart');
=======
      await apiService.clearCart();
      return true;
    } catch (error: any) {
      return rejectWithValue(apiService.handleError(error));
>>>>>>> v.3.0
    }
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
<<<<<<< HEAD
  },
  extraReducers: (builder) => {
    builder
=======
    setShippingAddress: (state, action: PayloadAction<ShippingAddress>) => {
      state.shippingAddress = action.payload;
      state.orderSummary = calculateOrderSummary(state.items, state.orderSummary.shipping, state.promoCode);
    },
    setPaymentMethod: (state, action: PayloadAction<PaymentMethod>) => {
      state.paymentMethod = action.payload;
    },
    setShippingCost: (state, action: PayloadAction<number>) => {
      state.orderSummary.shipping = action.payload;
      state.orderSummary = calculateOrderSummary(state.items, action.payload, state.promoCode);
    },
    removePromoCode: (state) => {
      state.promoCode = null;
      state.orderSummary = calculateOrderSummary(state.items, state.orderSummary.shipping, null);
    },
    updateQuantityLocally: (state, action: PayloadAction<{ itemId: string; quantity: number }>) => {
      const item = state.items.find(i => i.id === action.payload.itemId);
      if (item && action.payload.quantity > 0) {
        item.quantity = action.payload.quantity;
        item.updatedAt = new Date().toISOString();
        state.orderSummary = calculateOrderSummary(state.items, state.orderSummary.shipping, state.promoCode);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Sync cart
      .addCase(syncCart.pending, (state) => {
        state.isSyncing = true;
      })
      .addCase(syncCart.fulfilled, (state, action) => {
        state.isSyncing = false;
        state.items = action.payload.items;
        state.savedForLater = action.payload.savedForLater;
        state.orderSummary = calculateOrderSummary(state.items, state.orderSummary.shipping, state.promoCode);
        state.lastSyncedAt = new Date().toISOString();
      })
      .addCase(syncCart.rejected, (state, action) => {
        state.isSyncing = false;
        state.error = action.payload as string;
      })
>>>>>>> v.3.0
      // Fetch cart
      .addCase(fetchCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.isLoading = false;
<<<<<<< HEAD
        state.items = action.payload;
=======
        state.items = action.payload.items;
        state.savedForLater = action.payload.savedForLater;
        state.orderSummary = calculateOrderSummary(state.items, state.orderSummary.shipping, state.promoCode);
        state.lastSyncedAt = new Date().toISOString();
>>>>>>> v.3.0
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Add to cart
      .addCase(addToCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.isLoading = false;
<<<<<<< HEAD
        const existingIndex = state.items.findIndex(item => item.partId === action.payload.partId);
        if (existingIndex >= 0) {
          state.items[existingIndex].quantity += action.payload.quantity;
        } else {
          state.items.push(action.payload);
        }
=======
        const existingItemIndex = state.items.findIndex(item => item.partId === action.payload.partId);
        if (existingItemIndex !== -1) {
          state.items[existingItemIndex] = action.payload;
        } else {
          state.items.push(action.payload);
        }
        state.orderSummary = calculateOrderSummary(state.items, state.orderSummary.shipping, state.promoCode);
>>>>>>> v.3.0
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update cart item
<<<<<<< HEAD
      .addCase(updateCartItem.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.isLoading = false;
=======
      .addCase(updateCartItem.fulfilled, (state, action) => {
>>>>>>> v.3.0
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
<<<<<<< HEAD
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Remove from cart
      .addCase(removeFromCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = state.items.filter(item => item.id !== action.payload);
      })
      .addCase(removeFromCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Clear cart
      .addCase(clearCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(clearCart.fulfilled, (state) => {
        state.isLoading = false;
        state.items = [];
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
=======
        state.orderSummary = calculateOrderSummary(state.items, state.orderSummary.shipping, state.promoCode);
      })
      // Remove from cart
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item.id !== action.payload);
        state.orderSummary = calculateOrderSummary(state.items, state.orderSummary.shipping, state.promoCode);
      })
      // Move to saved for later
      .addCase(moveToSavedForLater.fulfilled, (state, action) => {
        const item = state.items.find(i => i.id === action.payload.itemId);
        if (item) {
          state.items = state.items.filter(i => i.id !== action.payload.itemId);
          state.savedForLater.push(item);
          state.orderSummary = calculateOrderSummary(state.items, state.orderSummary.shipping, state.promoCode);
        }
      })
      // Move to cart
      .addCase(moveToCart.fulfilled, (state, action) => {
        const item = state.savedForLater.find(i => i.id === action.payload.itemId);
        if (item) {
          state.savedForLater = state.savedForLater.filter(i => i.id !== action.payload.itemId);
          state.items.push(item);
          state.orderSummary = calculateOrderSummary(state.items, state.orderSummary.shipping, state.promoCode);
        }
      })
      // Apply promo code
      .addCase(applyPromoCode.fulfilled, (state, action) => {
        state.promoCode = action.payload.promoCode;
        state.orderSummary = calculateOrderSummary(state.items, state.orderSummary.shipping, action.payload.promoCode);
      })
      // Clear cart
      .addCase(clearCart.fulfilled, (state) => {
        state.items = [];
        state.orderSummary = calculateOrderSummary([], state.orderSummary.shipping, state.promoCode);
>>>>>>> v.3.0
      });
  },
});

<<<<<<< HEAD
export const { clearError } = cartSlice.actions;
=======
export const {
  clearError,
  setShippingAddress,
  setPaymentMethod,
  setShippingCost,
  removePromoCode,
  updateQuantityLocally,
} = cartSlice.actions;

>>>>>>> v.3.0
export default cartSlice.reducer;