import * as authService from "../services/auth.service.js";

/**
 * POST /auth/login
 */
export async function login(req, res) {
  try {
    const { username, password } = req.body;
    const result = await authService.loginUser(username, password);
    authService.setRefreshTokenCookie(res, result.refreshToken);
    return res.json({ success: true, token: result.token, user: result.user });
  } catch (err) {
    console.error("[Auth] Exception during login:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Internal server error.",
    });
  }
}

/**
 * POST /auth/refresh
 * Uses the refresh_token httpOnly cookie to issue a new access token.
 */
export async function refresh(req, res) {
  try {
    const refreshToken = req.cookies?.refresh_token;
    const result = await authService.refreshAccessToken(refreshToken);
    authService.setRefreshTokenCookie(res, result.refreshToken);
    return res.json({ success: true, token: result.token, user: result.user });
  } catch (err) {
    res.clearCookie("refresh_token", { path: "/" });
    return res.status(err.statusCode || 401).json({
      success: false,
      message: err.message,
    });
  }
}

/**
 * POST /auth/logout
 */
export async function logout(req, res) {
  res.clearCookie("refresh_token", { path: "/" });
  return res.json({ success: true, message: "Logged out successfully." });
}

/**
 * POST /auth/register
 */
export async function register(req, res) {
  try {
    const { username, password } = req.body;
    const result = await authService.registerUser(username, password);
    authService.setRefreshTokenCookie(res, result.refreshToken);
    return res.status(201).json({ success: true, token: result.token, user: result.user });
  } catch (err) {
    console.error("[Auth] Exception during register:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "حدث خطأ في الخادم.",
    });
  }
}
