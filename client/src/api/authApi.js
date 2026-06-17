import { baseApi } from './baseApi.js';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['Auth']
    }),
    logout: builder.mutation({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      invalidatesTags: ['Auth']
    }),
    me: builder.query({
      query: () => '/auth/me',
      providesTags: ['Auth']
    })
  })
});

export const { useLoginMutation, useLogoutMutation, useMeQuery } = authApi;
