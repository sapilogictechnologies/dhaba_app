import { baseApi } from './baseApi.js';

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query({
      query: () => '/settings',
      providesTags: ['Settings']
    }),
    updateSettings: builder.mutation({
      query: (body) => ({ url: '/settings', method: 'PATCH', body }),
      invalidatesTags: ['Settings']
    })
  })
});

export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApi;
