import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer from '../features/authSlice.js';
import customerAuthReducer from '../features/customerAuthSlice.js';
import { baseApi } from '../api/baseApi.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    customerAuth: customerAuthReducer,
    [baseApi.reducerPath]: baseApi.reducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware)
});

setupListeners(store.dispatch);
