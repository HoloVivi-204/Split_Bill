function parseJsonField(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value;
  }

  return JSON.parse(value);
}

function coerceNumber(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}

function normalizeExpensePayload(request, _response, next) {
  try {
    if (!request.is('multipart/form-data')) {
      next();
      return;
    }

    request.body = {
      ...request.body,
      amount: coerceNumber(request.body.amount),
      splits: parseJsonField(request.body.splits, undefined)
    };

    next();
  } catch {
    next(new Error('INVALID_MULTIPART_JSON'));
  }
}

module.exports = {
  normalizeExpensePayload
};
