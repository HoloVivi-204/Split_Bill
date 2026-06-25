const env = require("../../config/env");
const { AppError } = require("../../utils/appError");
const { fetchJson, findSelectedBank, getVietQrUrl, listBanks } = require("./bankProvider.service");

function assertLookupConfigured() {
  if (!env.VIETQR_CLIENT_ID || !env.VIETQR_API_KEY) {
    throw new AppError({
      statusCode: 503,
      code: "BANK_LOOKUP_NOT_CONFIGURED",
      message: "Chưa cấu hình dịch vụ tự động kiểm tra tên chủ tài khoản"
    });
  }
}

async function lookupBankAccount({ bankId, accountNumber }) {
  assertLookupConfigured();

  const banks = await listBanks();
  const selectedBank = findSelectedBank(banks, bankId);

  if (!selectedBank) {
    throw new AppError({
      statusCode: 404,
      code: "BANK_NOT_FOUND",
      message: "Ngân hàng không tồn tại"
    });
  }

  if (!selectedBank.lookup_supported) {
    throw new AppError({
      statusCode: 422,
      code: "BANK_LOOKUP_UNSUPPORTED",
      message: "Ngân hàng đã chọn chưa hỗ trợ tự động kiểm tra tên chủ tài khoản"
    });
  }

  const body = await fetchJson(getVietQrUrl("/lookup"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": env.VIETQR_CLIENT_ID,
      "x-api-key": env.VIETQR_API_KEY
    },
    body: JSON.stringify({
      bin: selectedBank.bank_id,
      accountNumber
    })
  });

  const accountName = body?.data?.accountName;

  if (body?.code !== "00" || !accountName) {
    throw new AppError({
      statusCode: 422,
      code: "BANK_ACCOUNT_LOOKUP_FAILED",
      message: "Không kiểm tra được tên chủ tài khoản. Vui lòng kiểm tra lại ngân hàng và số tài khoản"
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

module.exports = {
  lookupBankAccount
};
