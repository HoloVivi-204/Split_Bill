import { describe, expect, test } from 'vitest';

import { getRoleLabel, ROLE_LABELS } from './groupRoles';

describe('group role labels', () => {
  test('maps known group roles to Vietnamese labels', () => {
    expect(ROLE_LABELS).toEqual({
      leader: 'Trưởng nhóm',
      secretary: 'Thư ký',
      member: 'Thành viên',
    });
  });

  test('keeps unknown roles visible for debugging and compatibility', () => {
    expect(getRoleLabel('auditor')).toBe('auditor');
  });
});
