const env = require("../../config/env");
const { AppError } = require("../../utils/appError");

function getVietQrUrl(path) {
  return `${env.VIETQR_API_BASE_URL.replace(/\/$/, "")}${path}`;
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
        code: "BANK_PROVIDER_UNAVAILABLE",
        message: "Không thể kết nối dịch vụ ngân hàng"
      });
    }

    return body;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError({
      statusCode: 502,
      code: "BANK_PROVIDER_UNAVAILABLE",
      message: "Không thể kết nối dịch vụ ngân hàng"
    });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeLookupSupported(value) {
  return value === true || value === 1 || value === "1";
}

function normalizeBank(bank) {
  return {
    bank_id: String(bank.bin || bank.code || bank.id || "").trim(),
    bank_code: bank.code || null,
    bank_name: bank.shortName || bank.short_name || bank.name || null,
    full_name: bank.name || bank.shortName || bank.short_name || null,
    lookup_supported: normalizeLookupSupported(bank.lookupSupported ?? bank.lookup_supported)
  };
}

async function listBanks() {
  const body = await fetchJson(getVietQrUrl("/banks"));

  if (body?.code && body.code !== "00") {
    throw new AppError({
      statusCode: 502,
      code: "BANK_PROVIDER_UNAVAILABLE",
      message: "Không thể tải danh sách ngân hàng"
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
      String(bank.bank_code || "").toLowerCase() === bankId.toLowerCase()
  );
}

module.exports = {
  fetchJson,
  findSelectedBank,
  getVietQrUrl,
  listBanks
};
