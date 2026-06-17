import { baseApi } from './baseApi.js';

export const reportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getHealth: builder.query({
      query: () => '/health'
    }),
    getDailyReport: builder.query({
      query: (date) => ({ url: '/reports/daily', params: date ? { date } : {} }),
      providesTags: ['Reports']
    }),
    exportReportCsv: builder.query({
      query: (date) => ({ url: '/reports/export', params: date ? { date } : {} }),
      providesTags: ['Reports']
    })
  })
});

export const { useGetHealthQuery, useGetDailyReportQuery, useLazyExportReportCsvQuery } = reportApi;
