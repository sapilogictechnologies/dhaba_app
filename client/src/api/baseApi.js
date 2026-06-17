import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const baseApi = createApi({
  reducerPath: 'dhabaApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
    prepareHeaders: (headers, { getState }) => {
      // Staff token takes priority; customer token used as fallback
      const staffToken    = getState().auth.token || localStorage.getItem('dhabaToken');
      const customerToken = getState().customerAuth?.token || localStorage.getItem('dhabaCustomerToken');
      const token = staffToken || customerToken;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    }
  }),
  tagTypes: ['Auth', 'Settings', 'Menu', 'Tables', 'Orders', 'Reports', 'Expenses', 'CustomerProfile'],
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({})
});
