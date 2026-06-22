const { buildSuccessResponse } = require('../../utils/apiResponse');
const statsService = require('./stats.service');

async function getGroupOverview(request, response, next) {
  try {
    const data = await statsService.getGroupOverview(request.params.id, request.query);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function getStatsByCategory(request, response, next) {
  try {
    const data = await statsService.getStatsByCategory(request.params.id, request.query);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function getStatsByMember(request, response, next) {
  try {
    const data = await statsService.getStatsByMember(request.params.id, request.query);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function getStatsTimeline(request, response, next) {
  try {
    const data = await statsService.getStatsTimeline(request.params.id, request.query);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getGroupOverview,
  getStatsByCategory,
  getStatsByMember,
  getStatsTimeline
};
