const { buildSuccessResponse } = require('../../utils/apiResponse');
const campaignsService = require('./campaigns.service');

async function createCampaign(request, response, next) {
  try {
    const data = await campaignsService.createCampaign(
      request.params.id,
      request.user.id,
      request.body,
      request.app.get('io')
    );
    response.status(201).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function listCampaigns(request, response, next) {
  try {
    const data = await campaignsService.listCampaigns(request.params.id, request.query);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function getCampaignDetail(request, response, next) {
  try {
    const data = await campaignsService.getCampaignDetail(request.params.id, request.params.cId);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function updateCampaign(request, response, next) {
  try {
    const data = await campaignsService.updateCampaign(
      request.params.id,
      request.params.cId,
      request.body
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function mutateCampaign(request, response, next) {
  try {
    const data = await campaignsService.mutateCampaign(
      request.params.id,
      request.params.cId,
      request.body.action
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function listContributions(request, response, next) {
  try {
    const data = await campaignsService.listContributions(request.params.id, request.params.cId);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCampaign,
  listCampaigns,
  getCampaignDetail,
  updateCampaign,
  mutateCampaign,
  listContributions
};
