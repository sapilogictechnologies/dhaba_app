import { createSlice } from '@reduxjs/toolkit';
import { getCustomerToken } from '../utils/customerAuth.js';

// Decode JWT payload (no verification needed on client)
const decodeToken = (token) => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

const persistedToken = getCustomerToken();
const persistedPayload = decodeToken(persistedToken);

const customerAuthSlice = createSlice({
  name: 'customerAuth',
  initialState: {
    token: persistedPayload ? persistedToken : null,
    user: null  // full user object loaded from /api/customers/me
  },
  reducers: {
    setCustomerCredentials: (state, action) => {
      state.token = action.payload.token;
      state.user  = action.payload.user;
    },
    clearCustomerCredentials: (state) => {
      state.token = null;
      state.user  = null;
    },
    updateCustomerUser: (state, action) => {
      state.user = action.payload;
    }
  }
});

export const { setCustomerCredentials, clearCustomerCredentials, updateCustomerUser } = customerAuthSlice.actions;
export default customerAuthSlice.reducer;
