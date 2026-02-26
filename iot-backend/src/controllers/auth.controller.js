import * as authService from "../services/auth.service.js";

/**
 * POST /auth/login
 */
export async function login(req, res) {
  try {
    const { username, password } = req.body;
    const result = await authService.loginUser(username, password);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("[Auth] Exception during login:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Internal server error.",
    });
  }
}

/**
 * POST /auth/register
 */
export async function register(req, res) {
  try {
    const { username, password } = req.body;
    const result = await authService.registerUser(username, password);
    return res.status(201).json({ success: true, ...result });
  } catch (err) {
    console.error("[Auth] Exception during register:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "حدث خطأ في الخادم.",
    });
  }
}
