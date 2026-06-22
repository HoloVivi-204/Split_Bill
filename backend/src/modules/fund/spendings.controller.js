const { buildSuccessResponse } = require('../../utils/apiResponse');
const spendingsService = require('./spendings.service');

async function createSpending(request, response, next) {
  try {
    const data = await spendingsService.createSpending(
      request.params.id,
      request.user.id,
      request.body,
      request.file
    );
    response.status(201).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function listSpendings(request, response, next) {
  try {
    const data = await spendingsService.listSpendings(request.params.id);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function getFundBalance(request, response, next) {
  try {
    const data = await spendingsService.getFundBalance(request.params.id);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function updateSpending(request, response, next) {
  try {
    const data = await spendingsService.updateSpending(
      request.params.id,
      request.params.sId,
      request.body,
      request.file
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function deleteSpending(request, response, next) {
  try {
    await spendingsService.deleteSpending(request.params.id, request.params.sId);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createSpending,
  listSpendings,
  getFundBalance,
  updateSpending,
  deleteSpending
};
