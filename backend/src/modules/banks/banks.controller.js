const { buildSuccessResponse } = require('../../utils/apiResponse');
const banksService = require('./banks.service');

async function listBanks(_request, response, next) {
  try {
    const data = await banksService.listBanks();
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function lookupBankAccount(request, response, next) {
  try {
    const data = await banksService.lookupBankAccount({
      bankId: request.body.bank_id,
      accountNumber: request.body.account_number
    });
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listBanks,
  lookupBankAccount
};
