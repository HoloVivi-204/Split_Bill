const { buildSuccessResponse } = require('../../utils/apiResponse');
const contributionsService = require('./contributions.service');

async function getMyContribution(request, response, next) {
  try {
    const data = await contributionsService.getMyContribution(
      request.params.id,
      request.params.cId,
      request.user.id
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function confirmContribution(request, response, next) {
  try {
    const data = await contributionsService.confirmContribution(
      request.params.id,
      request.params.cId,
      request.params.userId,
      request.user.id,
      request.body,
      request.app.get("io")
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function listContributionHistory(request, response, next) {
  try {
    const data = await contributionsService.listContributionHistory(
      request.params.id,
      request.params.cId
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyContribution,
  confirmContribution,
  listContributionHistory
};
