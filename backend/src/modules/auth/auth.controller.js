const { buildSuccessResponse } = require("../../utils/apiResponse");
const authService = require("./auth.service");

async function register(request, response, next) {
  try {
    const result = await authService.register(request.body);
    response.cookie(
      authService.REFRESH_COOKIE_NAME,
      result.refreshToken.token,
      authService.buildRefreshCookieOptions(result.refreshToken.maxAge)
    );
    response.status(201).json(buildSuccessResponse(result.data));
  } catch (error) {
    next(error);
  }
}

async function getMe(request, response, next) {
  try {
    const data = await authService.getMe(request.user.id);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function login(request, response, next) {
  try {
    const result = await authService.login(request.body);
    response.cookie(
      authService.REFRESH_COOKIE_NAME,
      result.refreshToken.token,
      authService.buildRefreshCookieOptions(result.refreshToken.maxAge)
    );
    response.status(200).json(buildSuccessResponse(result.data));
  } catch (error) {
    next(error);
  }
}

async function refresh(request, response, next) {
  try {
    const result = await authService.refresh(request.cookies?.[authService.REFRESH_COOKIE_NAME]);
    response.cookie(
      authService.REFRESH_COOKIE_NAME,
      result.refreshToken.token,
      authService.buildRefreshCookieOptions(result.refreshToken.maxAge)
    );
    response.status(200).json(buildSuccessResponse(result.data));
  } catch (error) {
    next(error);
  }
}

async function updateProfile(request, response, next) {
  try {
    const data = await authService.updateProfile(request.user.id, request.body);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function updateDisplayName(request, response, next) {
  try {
    const data = await authService.updateDisplayName(request.user.id, request.body.display_name);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function changePassword(request, response, next) {
  try {
    const data = await authService.changePassword(request.user.id, request.body);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function logout(request, response, next) {
  try {
    const data = await authService.logout(request.cookies?.[authService.REFRESH_COOKIE_NAME]);
    response.clearCookie(
      authService.REFRESH_COOKIE_NAME,
      authService.buildClearRefreshCookieOptions()
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function deleteAccount(request, response, next) {
  try {
    const data = await authService.deleteAccount(request.user.id);
    response.clearCookie(
      authService.REFRESH_COOKIE_NAME,
      authService.buildClearRefreshCookieOptions()
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function recover(request, response, next) {
  try {
    const data = await authService.recover(request.body);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function getRecoveryCodes(request, response, next) {
  try {
    const data = await authService.getRecoveryCodes(request.user.id);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function regenerateRecoveryCodes(request, response, next) {
  try {
    const data = await authService.regenerateRecoveryCodes(request.user.id, request.body.password);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function deleteAvatar(request, response, next) {
  try {
    const data = await authService.deleteAvatar(request.user.id);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function uploadAvatar(request, response, next) {
  try {
    const data = await authService.uploadAvatar(request.user.id, request.file);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  getMe,
  login,
  refresh,
  updateProfile,
  updateDisplayName,
  changePassword,
  logout,
  deleteAccount,
  recover,
  getRecoveryCodes,
  regenerateRecoveryCodes,
  deleteAvatar,
  uploadAvatar
};
