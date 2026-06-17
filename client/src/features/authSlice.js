import { createSlice } from '@reduxjs/toolkit';

const storedUser = localStorage.getItem('dhabaUser');
const storedToken = localStorage.getItem('dhabaToken');

const initialState = {
  token: storedToken || null,
  user: storedUser ? JSON.parse(storedUser) : null,
  isAuthenticated: Boolean(storedToken)
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      localStorage.setItem('dhabaToken', action.payload.token);
      localStorage.setItem('dhabaUser', JSON.stringify(action.payload.user));
    },
    clearCredentials: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('dhabaToken');
      localStorage.removeItem('dhabaUser');
    }
  }
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
