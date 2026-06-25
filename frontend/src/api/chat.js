import { apiClient } from './axios';

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
