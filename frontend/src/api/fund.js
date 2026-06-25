import { apiClient } from './axios';

function getFormDataHeaders(payload) {
  return payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined;
}

export async function listFundCampaigns(groupId, params = {}) {
  const response = await apiClient.get(`/groups/${groupId}/fund/campaigns`, {
    params,
  });

  return response.data?.data ?? [];
}

export async function getFundCampaignDetail(groupId, campaignId) {
  const response = await apiClient.get(`/groups/${groupId}/fund/campaigns/${campaignId}`);

  return response.data?.data;
}

export async function createFundCampaign(groupId, payload) {
  const response = await apiClient.post(`/groups/${groupId}/fund/campaigns`, payload);

  return response.data?.data;
}

export async function updateFundCampaign(groupId, campaignId, payload) {
  const response = await apiClient.patch(`/groups/${groupId}/fund/campaigns/${campaignId}`, payload);

  return response.data?.data;
}

export async function mutateFundCampaign(groupId, campaignId, payload) {
  const response = await apiClient.delete(`/groups/${groupId}/fund/campaigns/${campaignId}`, {
    data: payload,
  });

  return response.data?.data;
}

export async function listFundContributions(groupId, campaignId) {
  const response = await apiClient.get(
    `/groups/${groupId}/fund/campaigns/${campaignId}/contributions`,
  );

  return response.data?.data;
}

export async function getMyFundContribution(groupId, campaignId) {
  const response = await apiClient.get(
    `/groups/${groupId}/fund/campaigns/${campaignId}/contributions/me`,
  );

  return response.data?.data;
}

export async function confirmFundContribution(groupId, campaignId, userId, payload) {
  const response = await apiClient.patch(
    `/groups/${groupId}/fund/campaigns/${campaignId}/contributions/${userId}`,
    payload,
  );

  return response.data?.data;
}

export async function listFundContributionHistory(groupId, campaignId) {
  const response = await apiClient.get(
    `/groups/${groupId}/fund/campaigns/${campaignId}/contributions/history`,
  );

  return response.data?.data;
}

export async function createFundQr(groupId, payload) {
  const response = await apiClient.post(`/groups/${groupId}/fund/qr`, payload);

  return response.data?.data;
}

export async function getFundQr(groupId, campaignId) {
  const response = await apiClient.get(`/groups/${groupId}/fund/qr`, {
    params: {
      campaign_id: campaignId,
    },
  });

  return response.data?.data;
}

export async function listFundSpendings(groupId) {
  const response = await apiClient.get(`/groups/${groupId}/fund/spendings`);

  return response.data?.data ?? [];
}

export async function createFundSpending(groupId, payload) {
  const response = await apiClient.post(`/groups/${groupId}/fund/spendings`, payload, {
    headers: getFormDataHeaders(payload),
  });

  return response.data?.data;
}

export async function updateFundSpending(groupId, spendingId, payload) {
  const response = await apiClient.patch(`/groups/${groupId}/fund/spendings/${spendingId}`, payload, {
    headers: getFormDataHeaders(payload),
  });

  return response.data?.data;
}

export async function deleteFundSpending(groupId, spendingId) {
  await apiClient.delete(`/groups/${groupId}/fund/spendings/${spendingId}`);
}

export async function getFundBalance(groupId) {
  const response = await apiClient.get(`/groups/${groupId}/fund/balance`);

  return response.data?.data;
}
