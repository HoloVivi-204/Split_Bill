/* global beforeEach, describe, expect, test */

require("../../test/env");

describe("auth service", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = "test";
    process.env.FRONTEND_URL = "http://localhost:5173";
    process.env.BACKEND_URL = "http://localhost:3000";
  });

  test("buildRefreshCookieOptions keeps refresh cookie httpOnly and scoped to auth routes", () => {
    const authService = require("./auth.service");

    expect(authService.REFRESH_COOKIE_NAME).toBe("refresh_token");
    expect(authService.buildRefreshCookieOptions(12345)).toEqual({
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      signed: false,
      path: "/api/auth",
      maxAge: 12345
    });
    expect(authService.buildClearRefreshCookieOptions()).toEqual({
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      signed: false,
      path: "/api/auth"
    });
  });
});
