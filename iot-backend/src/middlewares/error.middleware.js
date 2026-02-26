/**
 * 404 Not Found Handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
}

/**
 * Global Error Handler
 */
export function globalErrorHandler(err, req, res, next) {
  console.error("Global Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
