import * as userService from "../services/user.service.js";

/**
 * GET /api/users/me
 */
export async function getProfile(req, res) {
  try {
    // Prevent stale reads — device counts must always be fresh
    res.setHeader("Cache-Control", "no-store");
    const user = await userService.getUserProfile(req.user.id);
    res.json({ success: true, user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

/**
 * PATCH /api/users/me
 */
export async function updateProfile(req, res) {
  try {
    const user = await userService.updateUserProfile(req.user.id, req.body);
    res.json({ success: true, message: "Profile updated", user });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}
