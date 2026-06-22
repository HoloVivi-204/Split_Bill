function validate(schema, target = "body") {
  return async (request, _response, next) => {
    try {
      request[target] = await schema.parseAsync(request[target]);
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  validate
};
