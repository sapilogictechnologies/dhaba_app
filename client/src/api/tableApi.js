import { baseApi } from './baseApi.js';

export const tableApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTables: builder.query({
      query: () => '/tables',
      providesTags: ['Tables']
    }),
    createTable: builder.mutation({
      query: (body) => ({ url: '/tables', method: 'POST', body }),
      invalidatesTags: ['Tables']
    }),
    updateTable: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/tables/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Tables']
    }),
    deleteTable: builder.mutation({
      query: (id) => ({ url: `/tables/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Tables']
    }),
    generateTableQr: builder.mutation({
      query: (id) => ({ url: `/tables/${id}/qr`, method: 'POST' }),
      invalidatesTags: ['Tables']
    }),
    validateTableQr: builder.query({
      query: ({ tableNumber, token }) => ({ url: '/tables/validate', params: { tableNumber, token } }),
      providesTags: ['Tables']
    })
  })
});

export const {
  useGetTablesQuery,
  useCreateTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
  useGenerateTableQrMutation,
  useValidateTableQrQuery
} = tableApi;
