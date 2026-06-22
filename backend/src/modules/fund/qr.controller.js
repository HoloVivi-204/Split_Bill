const { buildSuccessResponse } = require('../../utils/apiResponse');
const qrService = require('./qr.service');

async function createQr(request, response, next) {
  try {
    const data = await qrService.createQr(request.params.id, request.user.id, request.body);
    response.status(201).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function getQr(request, response, next) {
  try {
    const data = await qrService.getQr(
      request.params.id,
      request.query.campaign_id,
      request.user.id
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function deleteQr(request, response, next) {
  try {
    await qrService.deleteQr(request.params.id, request.params.qrId);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createQr,
  getQr,
  deleteQr
};
