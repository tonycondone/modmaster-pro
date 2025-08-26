import { createSlice } from '@reduxjs/toolkit';

interface PartState {
  searchResults: any[];
  categories: string[];
  isLoading: boolean;
}

const initialState: PartState = {
  searchResults: [],
  categories: [],
  isLoading: false,
};

const partSlice = createSlice({
  name: 'parts',
  initialState,
  reducers: {
    setSearchResults: (state, action) => {
      state.searchResults = action.payload;
    },
    setCategories: (state, action) => {
      state.categories = action.payload;
    },
  },
});

export const { setSearchResults, setCategories } = partSlice.actions;
export default partSlice.reducer;