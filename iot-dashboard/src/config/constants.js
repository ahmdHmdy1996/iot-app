/**
 * Application Constants
 */

// API Configuration
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
export const API_KEY = import.meta.env.VITE_API_KEY;

// Auth (JWT) – key used in localStorage
export const AUTH_TOKEN_KEY = "token";

// Polling and Timeouts
export const REFRESH_INTERVAL = 60000; // 60 seconds - auto-refresh for live data
export const OFFLINE_THRESHOLD = 600000; // 10 minutes - device offline detection

// Temperature Thresholds (for refrigerators)
export const TEMP_WARNING_THRESHOLD = 10; // °C
export const TEMP_CRITICAL_THRESHOLD = 15; // °C

// Status Colors
export const STATUS_COLORS = {
  NORMAL: "#52c41a", // Green
  WARNING: "#faad14", // Orange
  CRITICAL: "#ff4d4f", // Red
  OFFLINE: "#8c8c8c", // Gray
};

// Chart Colors
export const CHART_COLORS = {
  TEMPERATURE: "#1890ff", // Blue
  HUMIDITY: "#52c41a", // Green
};
