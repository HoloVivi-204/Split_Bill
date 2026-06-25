import { apiClient } from './axios';

export async function getGroupBalances(groupId) {
  const response = await apiClient.get(`/groups/${groupId}/balances`);

  return response.data?.data;
}

export async function getSettlementSuggestions(groupId) {
  const response = await apiClient.get(`/groups/${groupId}/settlements/suggest`);

  return response.data?.data;
}

export async function createSettlement(groupId, payload) {
  const response = await apiClient.post(`/groups/${groupId}/settlements`, payload);

  return response.data?.data;
}

export async function listSettlements(groupId) {
  const response = await apiClient.get(`/groups/${groupId}/settlements`);

  return response.data?.data ?? [];
}

export async function getMySettlementBankInfo(groupId) {
  const response = await apiClient.get(`/groups/${groupId}/settlements/bank-info/me`);

  return response.data?.data ?? null;
}

export async function updateMySettlementBankInfo(groupId, payload) {
  const response = await apiClient.patch(`/groups/${groupId}/settlements/bank-info/me`, payload);

  return response.data?.data;
}

export async function deleteMySettlementBankInfo(groupId) {
  await apiClient.delete(`/groups/${groupId}/settlements/bank-info/me`);
}
