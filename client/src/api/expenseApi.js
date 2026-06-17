import { baseApi } from './baseApi.js';

export const expenseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExpenses: builder.query({
      query: (params = {}) => ({ url: '/expenses', params }),
      providesTags: ['Expenses']
    }),
    getExpenseSummary: builder.query({
      query: (params = {}) => ({ url: '/expenses/summary', params }),
      providesTags: ['Expenses']
    }),
    addExpense: builder.mutation({
      query: (body) => ({ url: '/expenses', method: 'POST', body }),
      invalidatesTags: ['Expenses', 'Reports']
    }),
    updateExpense: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/expenses/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Expenses', 'Reports']
    }),
    deleteExpense: builder.mutation({
      query: (id) => ({ url: `/expenses/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Expenses', 'Reports']
    })
  })
});

export const {
  useGetExpensesQuery,
  useGetExpenseSummaryQuery,
  useAddExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation
} = expenseApi;
