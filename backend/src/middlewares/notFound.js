const { AppError } = require("../utils/appError");

function notFoundMiddleware(request, _response, next) {
  next(
    new AppError({
      statusCode: 404,
      code: "RESOURCE_NOT_FOUND",
      message: `Route ${request.method} ${request.originalUrl} was not found`
    })
  );
}

module.exports = {
  notFoundMiddleware
};
