import apiClient from './client';

export const earningsApi = {
  getEarnings: ({ period, startDate, endDate } = {}) => {
    const params = {};
    if (period) params.period = period;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return apiClient.get('/earnings', { params }).then((r) => r.data);
  },
};
