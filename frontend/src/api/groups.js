import { apiClient } from './axios';

export async function listGroups() {
  const response = await apiClient.get('/groups');

  return response.data?.data ?? [];
}

export async function listBanks() {
  const response = await apiClient.get('/banks');

  return response.data?.data ?? [];
}

export async function listGroupConversations() {
  const response = await apiClient.get('/groups/conversations');

  return response.data?.data ?? [];
}

export async function createGroup(payload) {
  const response = await apiClient.post('/groups', payload);

  return response.data?.data;
}

export async function listInvitations(groupId) {
  const response = await apiClient.get(`/groups/${groupId}/invitations`);

  return response.data?.data ?? [];
}

export async function createInvitation(groupId, payload) {
  const response = await apiClient.post(`/groups/${groupId}/invitations`, payload);

  return response.data?.data;
}

export async function deleteInvitation(groupId, invitationId) {
  await apiClient.delete(`/groups/${groupId}/invitations/${invitationId}`);
}

export async function deleteGroup(groupId, payload) {
  const response = await apiClient.delete(`/groups/${groupId}`, {
    data: payload,
  });

  return response.data?.data;
}

export async function getGroupDetail(groupId) {
  const response = await apiClient.get(`/groups/${groupId}`);

  return response.data?.data;
}

export async function listGroupMembers(groupId) {
  const response = await apiClient.get(`/groups/${groupId}/members`);

  return response.data?.data ?? [];
}

export async function updateGroupMemberRole(groupId, userId, payload) {
  const response = await apiClient.patch(`/groups/${groupId}/members/${userId}`, payload);

  return response.data?.data;
}

export async function transferLeader(groupId, payload) {
  const response = await apiClient.patch(`/groups/${groupId}/leader`, payload);

  return response.data?.data;
}

export async function kickGroupMember(groupId, userId) {
  const response = await apiClient.delete(`/groups/${groupId}/members/${userId}`);

  return response.data?.data;
}

export async function requestLeaveGroup(groupId, payload) {
  const response = await apiClient.post(`/groups/${groupId}/leave`, payload);

  return response.data?.data;
}

export async function listLeaveRequests(groupId) {
  const response = await apiClient.get(`/groups/${groupId}/leave-requests`);

  return response.data?.data ?? [];
}

export async function processLeaveRequest(groupId, requestId, payload) {
  const response = await apiClient.patch(`/groups/${groupId}/leave-requests/${requestId}`, payload);

  return response.data?.data;
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
    headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });

  return response.data?.data;
}

export async function updateExpense(groupId, expenseId, payload) {
  const response = await apiClient.patch(`/groups/${groupId}/expenses/${expenseId}`, payload, {
    headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });

  return response.data?.data;
}

export async function deleteExpense(groupId, expenseId) {
  await apiClient.delete(`/groups/${groupId}/expenses/${expenseId}`);
}

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
  const response = await apiClient.get(`/groups/${groupId}/fund/campaigns/${campaignId}/contributions`);

  return response.data?.data;
}

export async function getMyFundContribution(groupId, campaignId) {
  const response = await apiClient.get(`/groups/${groupId}/fund/campaigns/${campaignId}/contributions/me`);

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
    headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });

  return response.data?.data;
}

export async function updateFundSpending(groupId, spendingId, payload) {
  const response = await apiClient.patch(`/groups/${groupId}/fund/spendings/${spendingId}`, payload, {
    headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
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

export async function listGroupMessages(groupId, params = {}) {
  const response = await apiClient.get(`/groups/${groupId}/messages`, {
    params,
  });

  return {
    data: response.data?.data ?? [],
    meta: response.data?.meta ?? null,
  };
}

export async function createGroupMessage(groupId, payload) {
  const response = await apiClient.post(`/groups/${groupId}/messages`, payload);

  return response.data?.data;
}

export async function deleteGroupMessage(groupId, messageId) {
  const response = await apiClient.delete(`/groups/${groupId}/messages/${messageId}`);

  return response.data?.data;
}

export async function pinGroupMessage(groupId, messageId, payload) {
  const response = await apiClient.patch(`/groups/${groupId}/messages/${messageId}/pin`, payload);

  return response.data?.data;
}

export async function listPinnedGroupMessages(groupId) {
  const response = await apiClient.get(`/groups/${groupId}/messages/pinned`);

  return response.data?.data ?? [];
}

export async function updateGroupChatSettings(groupId, payload) {
  const response = await apiClient.patch(`/groups/${groupId}/chat/me`, payload);

  return response.data?.data;
}

export async function leaveGroupChat(groupId) {
  const response = await apiClient.delete(`/groups/${groupId}/chat/me`);

  return response.data?.data;
}

export async function listAvailableChatParticipants(groupId) {
  const response = await apiClient.get(`/groups/${groupId}/chat/participants/available`);

  return response.data?.data ?? [];
}

export async function addGroupChatParticipant(groupId, payload) {
  const response = await apiClient.post(`/groups/${groupId}/chat/participants`, payload);

  return response.data?.data;
}

export async function listNotifications(params = {}) {
  const response = await apiClient.get('/notifications', {
    params,
  });

  return {
    data: response.data?.data ?? [],
    meta: response.data?.meta ?? null,
  };
}

export async function markNotificationRead(notificationId) {
  const response = await apiClient.patch(`/notifications/${notificationId}/read`);

  return response.data?.data;
}

export async function markAllNotificationsRead() {
  const response = await apiClient.patch('/notifications/read-all');

  return response.data?.data;
}

export async function getGroupStats(groupId, params = {}) {
  const response = await apiClient.get(`/groups/${groupId}/stats`, {
    params,
  });

  return response.data?.data;
}

export async function getGroupStatsByCategory(groupId, params = {}) {
  const response = await apiClient.get(`/groups/${groupId}/stats/by-category`, {
    params,
  });

  return response.data?.data ?? [];
}

export async function getGroupStatsByMember(groupId, params = {}) {
  const response = await apiClient.get(`/groups/${groupId}/stats/by-member`, {
    params,
  });

  return response.data?.data ?? [];
}

export async function getGroupStatsTimeline(groupId, params = {}) {
  const response = await apiClient.get(`/groups/${groupId}/stats/timeline`, {
    params,
  });

  return response.data?.data ?? [];
}
