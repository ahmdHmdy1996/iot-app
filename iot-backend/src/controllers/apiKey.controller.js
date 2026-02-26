import crypto from "crypto";
import prisma from "../config/db.js";

/**
 * POST /api/admin/generate-api-key/:userId
 * Generates a strong random API key and assigns it to the specified user.
 * Accessible only by SUPER_ADMIN (enforced by route-level middleware).
 */
export async function generateApiKey(req, res) {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID." });
    }

    // Verify the target user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existingUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Generate a cryptographically strong 32-byte hex key
    const apiKey = crypto.randomBytes(32).toString("hex");

    // Assign to the user (overwrites any existing key)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { apiKey },
      select: {
        id: true,
        username: true,
        role: true,
        apiKey: true,
      },
    });

    res.status(200).json({
      success: true,
      message:
        "API key generated successfully. Store it securely — it will not be shown again.",
      data: {
        userId: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        apiKey: updatedUser.apiKey,
      },
    });
  } catch (error) {
    console.error("Error generating API key:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}
