const { buildSuccessResponse } = require("../../utils/apiResponse");
const groupsService = require("./groups.service");

async function createGroup(request, response, next) {
  try {
    const data = await groupsService.createGroup(request.user.id, request.body);
    response.status(201).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function listGroups(request, response, next) {
  try {
    const data = await groupsService.listGroups(request.user.id);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function listGroupConversations(request, response, next) {
  try {
    const data = await groupsService.listGroupConversations(request.user.id);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function getGroupDetail(request, response, next) {
  try {
    const data = await groupsService.getGroupDetail(request.params.id, request.groupMembership);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function listGroupMembers(request, response, next) {
  try {
    const data = await groupsService.listGroupMembers(request.params.id);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function updateGroup(request, response, next) {
  try {
    const data = await groupsService.updateGroup(request.params.id, request.body);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function revokeInvitation(request, response, next) {
  try {
    await groupsService.revokeInvitation(request.params.id, request.params.invId);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function requestLeaveGroup(request, response, next) {
  try {
    const data = await groupsService.requestLeaveGroup(
      request.params.id,
      request.groupMembership,
      request.body,
      request.app.get("io")
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function listLeaveRequests(request, response, next) {
  try {
    const data = await groupsService.listLeaveRequests(request.params.id);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function processLeaveRequest(request, response, next) {
  try {
    const data = await groupsService.processLeaveRequest(
      request.params.id,
      request.params.requestId,
      request.body,
      request.app.get("io")
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function updateMemberRole(request, response, next) {
  try {
    const data = await groupsService.updateMemberRole(
      request.params.id,
      request.user.id,
      request.params.userId,
      request.body.role
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function transferLeader(request, response, next) {
  try {
    const data = await groupsService.transferLeader(
      request.params.id,
      request.user.id,
      request.body.new_leader_id
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function kickMember(request, response, next) {
  try {
    const data = await groupsService.kickMember(
      request.params.id,
      request.user.id,
      request.params.userId
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function deleteGroup(request, response, next) {
  try {
    const data = await groupsService.deleteGroup(
      request.params.id,
      request.groupMembership,
      request.body
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createGroup,
  listGroups,
  listGroupConversations,
  getGroupDetail,
  listGroupMembers,
  updateGroup,
  revokeInvitation,
  requestLeaveGroup,
  listLeaveRequests,
  processLeaveRequest,
  updateMemberRole,
  transferLeader,
  kickMember,
  deleteGroup
};
