module.exports = {
  ...require("./services/authToken.service"),
  ...require("./services/authRecovery.service"),
  ...require("./services/authProfile.service")
};
