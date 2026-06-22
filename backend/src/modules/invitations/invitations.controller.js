const { buildSuccessResponse } = require("../../utils/apiResponse");
const invitationsService = require("./invitations.service");

async function createInvitation(request, response, next) {
  try {
    const data = await invitationsService.createInvitation(
      request.params.id,
      request.user.id,
      request.body
    );
    response.status(201).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function listInvitations(request, response, next) {
  try {
    const data = await invitationsService.listInvitations(request.params.id);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function getInvitationPreview(request, response, next) {
  try {
    const data = await invitationsService.getInvitationPreview(request.params.token);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function joinInvitation(request, response, next) {
  try {
    const data = await invitationsService.joinInvitation(
      request.user.id,
      request.body.token,
      request.app.get("io")
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createInvitation,
  getInvitationPreview,
  listInvitations,
  joinInvitation
};
