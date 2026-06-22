const prisma = require("../config/prisma");
const { AppError } = require("../utils/appError");

async function groupMembershipMiddleware(request, _response, next) {
  try {
    const groupId = request.params.id || request.params.groupId;
    const membership = await prisma.groupMember.findUnique({
      where: {
        group_id_user_id: {
          group_id: groupId,
          user_id: request.user.id
        }
      }
    });

    if (!membership || membership.status !== "active") {
      return next(
        new AppError({
          statusCode: 403,
          code: "NOT_GROUP_MEMBER",
          message: "Bạn không phải thành viên của nhóm này"
        })
      );
    }

    request.groupMembership = membership;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  groupMembershipMiddleware
};
