import { apiClient } from './axios';

function getFormDataHeaders(payload) {
  return payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined;
}

export async function listExpenses(groupId, params = {}) {
  const response = await apiClient.get(`/groups/${groupId}/expenses`, {
    params,
  });

  return {
    data: response.data?.data ?? [],
    meta: response.data?.meta ?? null,
  };
}

export async function getExpenseDetail(groupId, expenseId) {
  const response = await apiClient.get(`/groups/${groupId}/expenses/${expenseId}`);

  return response.data?.data;
}

export async function createExpense(groupId, payload) {
  const response = await apiClient.post(`/groups/${groupId}/expenses`, payload, {
    headers: getFormDataHeaders(payload),
  });

  return response.data?.data;
}

export async function updateExpense(groupId, expenseId, payload) {
  const response = await apiClient.patch(`/groups/${groupId}/expenses/${expenseId}`, payload, {
    headers: getFormDataHeaders(payload),
  });

  return response.data?.data;
}

export async function deleteExpense(groupId, expenseId) {
  await apiClient.delete(`/groups/${groupId}/expenses/${expenseId}`);
}
