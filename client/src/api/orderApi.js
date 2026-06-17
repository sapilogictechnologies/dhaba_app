import { baseApi } from './baseApi.js';

export const orderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createTableOrder: builder.mutation({
      query: (body) => ({ url: '/orders/table', method: 'POST', body }),
      invalidatesTags: ['Orders', 'Tables', 'Reports']
    }),
    createTakeawayOrder: builder.mutation({
      query: (body) => ({ url: '/orders/takeaway', method: 'POST', body }),
      invalidatesTags: ['Orders', 'Reports']
    }),
    createPhoneOrder: builder.mutation({
      query: (body) => ({ url: '/orders/phone', method: 'POST', body }),
      invalidatesTags: ['Orders', 'Reports']
    }),
    createCustomerOrder: builder.mutation({
      query: (body) => ({ url: '/orders/customer', method: 'POST', body }),
      invalidatesTags: ['Orders', 'Tables', 'Reports']
    }),
    getOrders: builder.query({
      query: (params = {}) => ({ url: '/orders', params }),
      providesTags: ['Orders']
    }),
    getOrderById: builder.query({
      query: (id) => `/orders/${id}`,
      providesTags: ['Orders']
    }),
    getPublicOrder: builder.query({
      query: (orderNo) => `/orders/public/${orderNo}`,
      providesTags: ['Orders']
    }),
    getPublicMyOrders: builder.query({
      query: ({ phone, customerKey }) => ({ url: '/orders/public/my', params: { phone, customerKey } }),
      providesTags: ['Orders']
    }),
    updateOrderItems: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/orders/${id}/items`, method: 'PATCH', body }),
      invalidatesTags: ['Orders', 'Reports']
    }),
    updateOrderStatus: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/orders/${id}/status`, method: 'PATCH', body }),
      invalidatesTags: ['Orders', 'Tables', 'Reports']
    }),
    acceptOrder: builder.mutation({
      query: (id) => ({ url: `/orders/${id}/accept`, method: 'PATCH' }),
      invalidatesTags: ['Orders', 'Reports']
    }),
    rejectOrder: builder.mutation({
      query: ({ id, reason }) => ({ url: `/orders/${id}/reject`, method: 'PATCH', body: { reason } }),
      invalidatesTags: ['Orders', 'Tables', 'Reports']
    }),
    updateEta: builder.mutation({
      query: ({ id, etaMinutesOverride }) => ({ url: `/orders/${id}/eta`, method: 'PATCH', body: { etaMinutesOverride } }),
      invalidatesTags: ['Orders']
    }),
    verifyPayment: builder.mutation({
      query: (id) => ({ url: `/orders/${id}/payment/verify`, method: 'PATCH' }),
      invalidatesTags: ['Orders', 'Reports']
    }),
    rejectPayment: builder.mutation({
      query: ({ id, reason }) => ({ url: `/orders/${id}/payment/reject`, method: 'PATCH', body: { reason } }),
      invalidatesTags: ['Orders', 'Reports']
    }),
    recordPayment: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/orders/${id}/payment/record`, method: 'PATCH', body }),
      invalidatesTags: ['Orders', 'Tables', 'Reports']
    }),
    moveTable: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/orders/${id}/move-table`, method: 'PATCH', body }),
      invalidatesTags: ['Orders', 'Tables']
    }),
    mergeOrders: builder.mutation({
      query: ({ id, targetOrderId }) => ({ url: `/orders/${id}/merge`, method: 'PATCH', body: { targetOrderId } }),
      invalidatesTags: ['Orders', 'Tables', 'Reports']
    }),
    cancelOrder: builder.mutation({
      query: ({ id, reason, reasonText }) => ({ url: `/orders/${id}/cancel`, method: 'PATCH', body: { reason, reasonText } }),
      invalidatesTags: ['Orders', 'Tables', 'Reports']
    }),
    callWaiter: builder.mutation({
      query: ({ id, token }) => ({ url: `/orders/${id}/call-waiter`, method: 'POST', body: { token } }),
      invalidatesTags: ['Orders']
    })
  })
});

export const {
  useCreateTableOrderMutation,
  useCreateTakeawayOrderMutation,
  useCreatePhoneOrderMutation,
  useCreateCustomerOrderMutation,
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useGetPublicOrderQuery,
  useGetPublicMyOrdersQuery,
  useUpdateOrderItemsMutation,
  useUpdateOrderStatusMutation,
  useAcceptOrderMutation,
  useRejectOrderMutation,
  useUpdateEtaMutation,
  useVerifyPaymentMutation,
  useRejectPaymentMutation,
  useRecordPaymentMutation,
  useMoveTableMutation,
  useMergeOrdersMutation,
  useCancelOrderMutation,
  useCallWaiterMutation
} = orderApi;
