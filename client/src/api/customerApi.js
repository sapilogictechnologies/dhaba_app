import { baseApi } from './baseApi.js';

export const customerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    customerRegister: build.mutation({
      query: (body) => ({ url: '/customers/register', method: 'POST', body }),
      invalidatesTags: ['CustomerProfile']
    }),
    customerLogin: build.mutation({
      query: (body) => ({ url: '/customers/login', method: 'POST', body }),
      invalidatesTags: ['CustomerProfile']
    }),
    getCustomerProfile: build.query({
      query: () => '/customers/me',
      providesTags: ['CustomerProfile']
    }),
    updateCustomerProfile: build.mutation({
      query: (body) => ({ url: '/customers/me', method: 'PATCH', body }),
      invalidatesTags: ['CustomerProfile']
    }),
    changeCustomerPassword: build.mutation({
      query: (body) => ({ url: '/customers/me/change-password', method: 'POST', body })
    }),
    getCustomerOrders: build.query({
      query: () => '/customers/me/orders',
      providesTags: ['Orders']
    }),
    addCustomerAddress: build.mutation({
      query: (body) => ({ url: '/customers/me/addresses', method: 'POST', body }),
      invalidatesTags: ['CustomerProfile']
    }),
    deleteCustomerAddress: build.mutation({
      query: (addressId) => ({ url: `/customers/me/addresses/${addressId}`, method: 'DELETE' }),
      invalidatesTags: ['CustomerProfile']
    })
  })
});

export const {
  useCustomerRegisterMutation,
  useCustomerLoginMutation,
  useGetCustomerProfileQuery,
  useUpdateCustomerProfileMutation,
  useChangeCustomerPasswordMutation,
  useGetCustomerOrdersQuery,
  useAddCustomerAddressMutation,
  useDeleteCustomerAddressMutation
} = customerApi;
