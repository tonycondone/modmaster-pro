import { createSlice } from '@reduxjs/toolkit';

interface ProjectState {
  projects: any[];
  currentProject: any | null;
  isLoading: boolean;
}

const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  isLoading: false,
};

const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setProjects: (state, action) => {
      state.projects = action.payload;
    },
    setCurrentProject: (state, action) => {
      state.currentProject = action.payload;
    },
  },
});

export const { setProjects, setCurrentProject } = projectSlice.actions;
export default projectSlice.reducer;