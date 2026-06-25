const { AppError } = require("../../utils/appError");
const { findSelectedBank, listBanks } = require("./bankProvider.service");
const { lookupBankAccount } = require("./legacyBankLookup.service");

async function resolveBankAccount({ bankId, accountNumber }) {
  const banks = await listBanks();
  const selectedBank = findSelectedBank(banks, bankId);

  if (!selectedBank) {
    throw new AppError({
      statusCode: 404,
      code: "BANK_NOT_FOUND",
      message: "Ngân hàng không tồn tại"
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
