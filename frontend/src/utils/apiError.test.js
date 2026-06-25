import { describe, expect, test } from 'vitest';

import { getApiErrorMessage } from './apiError';

describe('getApiErrorMessage', () => {
  test('returns the API error message when it is available', () => {
    const error = {
      response: {
        data: {
          error: {
            message: 'Không thể tải dữ liệu.',
          },
        },
      },
    };

    expect(getApiErrorMessage(error, 'Fallback')).toBe('Không thể tải dữ liệu.');
  });

  test('returns the fallback when the API error message is missing', () => {
    expect(getApiErrorMessage(new Error('Network error'), 'Fallback')).toBe('Fallback');
  });
});
