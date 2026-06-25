import { apiClient } from './axios';

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
