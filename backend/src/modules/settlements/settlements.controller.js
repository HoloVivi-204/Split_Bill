const { buildSuccessResponse } = require('../../utils/apiResponse');
const settlementsService = require('./settlements.service');

async function getGroupBalances(request, response, next) {
  try {
    const data = await settlementsService.getGroupBalances(request.params.id);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function getSettlementSuggestions(request, response, next) {
  try {
    const data = await settlementsService.getSettlementSuggestions(request.params.id);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function getMySettlementBankInfo(request, response, next) {
  try {
    const data = settlementsService.getMySettlementBankInfo(request.groupMembership);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function updateMySettlementBankInfo(request, response, next) {
  try {
    const data = await settlementsService.updateMySettlementBankInfo(
      request.params.id,
      request.user.id,
      request.body
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function clearMySettlementBankInfo(request, response, next) {
  try {
    const data = await settlementsService.clearMySettlementBankInfo(
      request.params.id,
      request.user.id
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function createSettlement(request, response, next) {
  try {
    const data = await settlementsService.createSettlement(
      request.params.id,
      request.groupMembership,
      request.body
    );
    response.status(201).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function listSettlements(request, response, next) {
  try {
    const data = await settlementsService.listSettlements(request.params.id);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getGroupBalances,
  getSettlementSuggestions,
  getMySettlementBankInfo,
  updateMySettlementBankInfo,
  clearMySettlementBankInfo,
  createSettlement,
  listSettlements
};
