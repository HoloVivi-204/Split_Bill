const crypto = require("crypto");

function requestIdMiddleware(request, response, next) {
  const requestId = crypto.randomUUID();

  request.id = requestId;
  response.setHeader("X-Request-Id", requestId);

  next();
}

module.exports = {
  requestIdMiddleware
};
