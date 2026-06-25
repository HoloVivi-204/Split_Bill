import { apiClient } from './axios';

export async function listGroups() {
  const response = await apiClient.get('/groups');

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
