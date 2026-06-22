function buildSuccessResponse(data, meta) {
  const response = {
    success: true,
    data
  };

  if (meta) {
    response.meta = meta;
  }

  return response;
}

module.exports = {
  buildSuccessResponse
};
