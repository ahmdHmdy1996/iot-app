import * as settingsService from "../services/settings.service.js";

/**
 * GET /api/user/settings
 */
export async function getUserSettings(req, res) {
  try {
    const settings = await settingsService.getUserSettings(req.user.id);
    res.json({ success: true, settings });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

/**
 * PUT /api/user/settings
 */
export async function updateUserSettings(req, res) {
  try {
    const settings = await settingsService.updateUserSettings(
      req.user.id,
      req.body,
    );
    res.json({ success: true, message: "Settings updated", settings });
  } catch (error) {
    console.error("Error updating user settings:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

/**
 * POST /api/user/generate-token
 */
export async function generateToken(req, res) {
  try {
    const apiKey = await settingsService.generateApiKey(req.user.id);
    res.json({ success: true, apiKey });
  } catch (error) {
    console.error("Error generating API key:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}
