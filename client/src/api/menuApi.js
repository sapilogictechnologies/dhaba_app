import { baseApi } from './baseApi.js';

export const menuApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMenu: builder.query({
      query: (params = {}) => ({ url: '/menu', params }),
      providesTags: ['Menu']
    }),
    createMenuItem: builder.mutation({
      query: (body) => ({ url: '/menu', method: 'POST', body }),
      invalidatesTags: ['Menu']
    }),
    updateMenuItem: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/menu/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Menu']
    }),
    toggleMenuItem: builder.mutation({
      query: ({ id, isAvailable }) => ({ url: `/menu/${id}/toggle`, method: 'PATCH', body: { isAvailable } }),
      invalidatesTags: ['Menu']
    }),
    updateMenuStock: builder.mutation({
      query: ({ id, stockStatus }) => ({ url: `/menu/${id}/stock`, method: 'PATCH', body: { stockStatus } }),
      invalidatesTags: ['Menu', 'Orders']
    }),
    deleteMenuItem: builder.mutation({
      query: (id) => ({ url: `/menu/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Menu']
    })
  })
});

export const {
  useGetMenuQuery,
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
  useToggleMenuItemMutation,
  useUpdateMenuStockMutation,
  useDeleteMenuItemMutation
} = menuApi;
