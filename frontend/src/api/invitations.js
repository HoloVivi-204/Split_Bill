import { apiClient } from './axios';

export async function getInvitationPreview(token) {
  const response = await apiClient.get(`/invitations/${token}`);

  return response.data?.data;
}

export async function joinInvitation(payload) {
  const response = await apiClient.post('/invitations/join', payload);

  return response.data?.data;
}
