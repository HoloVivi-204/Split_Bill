export const ROLE_LABELS = {
  leader: 'Trưởng nhóm',
  secretary: 'Thư ký',
  member: 'Thành viên',
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] ?? role;
}
