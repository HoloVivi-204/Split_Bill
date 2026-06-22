const env = require('../../config/env');
const { AppError } = require('../../utils/appError');

function getVietQrUrl(path) {
  return `${env.VIETQR_API_BASE_URL.replace(/\/$/, '')}${path}`;
}

function assertLookupConfigured() {
  if (!env.VIETQR_CLIENT_ID || !env.VIETQR_API_KEY) {
    throw new AppError({
      statusCode: 503,
      code: 'BANK_LOOKUP_NOT_CONFIGURED',
      message: 'Chưa cấu hình dịch vụ tự động kiểm tra tên chủ tài khoản'
    });
  }
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.VIETQR_LOOKUP_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new AppError({
        statusCode: 502,
        code: 'BANK_PROVIDER_UNAVAILABLE',
        message: 'Không thể kết nối dịch vụ ngân hàng'
      });
    }

    return body;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError({
      statusCode: 502,
      code: 'BANK_PROVIDER_UNAVAILABLE',
      message: 'Không thể kết nối dịch vụ ngân hàng'
    });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeLookupSupported(value) {
  return value === true || value === 1 || value === '1';
}

function normalizeBank(bank) {
  return {
    bank_id: String(bank.bin || bank.code || bank.id || '').trim(),
    bank_code: bank.code || null,
    bank_name: bank.shortName || bank.short_name || bank.name || null,
    full_name: bank.name || bank.shortName || bank.short_name || null,
    lookup_supported: normalizeLookupSupported(bank.lookupSupported ?? bank.lookup_supported)
  };
}

async function listBanks() {
  const body = await fetchJson(getVietQrUrl('/banks'));

  if (body?.code && body.code !== '00') {
    throw new AppError({
      statusCode: 502,
      code: 'BANK_PROVIDER_UNAVAILABLE',
      message: 'Không thể tải danh sách ngân hàng'
    });
  }

  return (body?.data || [])
    .map(normalizeBank)
    .filter((bank) => bank.bank_id && bank.bank_name);
}

function findSelectedBank(banks, bankId) {
  return banks.find(
    (bank) =>
      bank.bank_id === bankId ||
      bank.bank_code === bankId ||
      String(bank.bank_code || '').toLowerCase() === bankId.toLowerCase()
  );
}

async function lookupBankAccount({ bankId, accountNumber }) {
  assertLookupConfigured();

  const banks = await listBanks();
  const selectedBank = findSelectedBank(banks, bankId);

  if (!selectedBank) {
    throw new AppError({
      statusCode: 404,
      code: 'BANK_NOT_FOUND',
      message: 'Ngân hàng không tồn tại'
    });
  }

  if (!selectedBank.lookup_supported) {
    throw new AppError({
      statusCode: 422,
      code: 'BANK_LOOKUP_UNSUPPORTED',
      message: 'Ngân hàng đã chọn chưa hỗ trợ tự động kiểm tra tên chủ tài khoản'
    });
  }

  const body = await fetchJson(getVietQrUrl('/lookup'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': env.VIETQR_CLIENT_ID,
      'x-api-key': env.VIETQR_API_KEY
    },
    body: JSON.stringify({
      bin: selectedBank.bank_id,
      accountNumber
    })
  });

  const accountName = body?.data?.accountName;

  if (body?.code !== '00' || !accountName) {
    throw new AppError({
      statusCode: 422,
      code: 'BANK_ACCOUNT_LOOKUP_FAILED',
      message: 'Không kiểm tra được tên chủ tài khoản. Vui lòng kiểm tra lại ngân hàng và số tài khoản'
    });
  }

  return {
    bank_id: selectedBank.bank_id,
    bank_code: selectedBank.bank_code,
    bank_name: selectedBank.bank_name,
    account_number: accountNumber,
    account_name: accountName
  };
}

async function resolveBankAccount({ bankId, accountNumber }) {
  const banks = await listBanks();
  const selectedBank = findSelectedBank(banks, bankId);

  if (!selectedBank) {
    throw new AppError({
      statusCode: 404,
      code: 'BANK_NOT_FOUND',
      message: 'Ngân hàng không tồn tại'
    });
  }

  return {
    bank_id: selectedBank.bank_id,
    bank_code: selectedBank.bank_code,
    bank_name: selectedBank.bank_name,
    account_number: accountNumber,
    account_name: null
  };
}

module.exports = {
  listBanks,
  lookupBankAccount,
  resolveBankAccount
};
