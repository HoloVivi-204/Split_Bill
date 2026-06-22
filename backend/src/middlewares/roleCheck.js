const { AppError } = require("../utils/appError");

function roleCheck(allowedRoles) {
  return (request, _response, next) => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!request.groupMembership || !roles.includes(request.groupMembership.role)) {
      return next(
        new AppError({
          statusCode: 403,
          code: "INSUFFICIENT_ROLE",
          message: "Vai trò của bạn không đủ quyền"
        })
      );
    }

    return next();
  };
}

module.exports = {
  roleCheck
};
