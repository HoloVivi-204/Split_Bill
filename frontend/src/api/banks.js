import { apiClient } from './axios';

export async function listBanks() {
  const response = await apiClient.get('/banks');

  return response.data?.data ?? [];
}
