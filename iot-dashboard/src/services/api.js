import axios from "axios";
import { API_BASE_URL, API_KEY, AUTH_TOKEN_KEY } from "../config/constants";

/**
 * API Service for Backend Communication
 */
class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
    });

    // Request interceptor: attach JWT when present
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      console.log(
        "[API Debug] Request:",
        config.method?.toUpperCase(),
        config.url,
      );
      console.log(
        "[API Debug] Token in localStorage:",
        token ? `${token.slice(0, 20)}...` : "NONE",
      );
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(
          "[API Debug] Response OK:",
          response.config.url,
          response.status,
        );
        return response.data;
      },
      (error) => {
        console.error(
          "[API Debug] Error:",
          error.config?.url,
          error.response?.status,
        );

        if (error.response) {
          if (error.response.status === 401) {
            console.warn(
              "[API Debug] 401 Unauthorized - Clearing token and redirecting",
            );
            localStorage.removeItem(AUTH_TOKEN_KEY);
            window.location.href = "/login";
            return Promise.reject(new Error("غير مصرح. يرجى تسجيل الدخول."));
          }
          throw new Error(error.response.data?.message || "Server error");
        } else if (error.request) {
          throw new Error(
            "No response from server. Please check your connection.",
          );
        } else {
          throw new Error(error.message);
        }
      },
    );
  }

  /**
   * Login (admin)
   * @param {Object} credentials - { username, password }
   * @returns {Promise<Object>} { success, token }
   */
  async login(credentials) {
    return await this.client.post("/auth/login", credentials);
  }

  /**
   * Get current device status
   * @returns {Promise<Object>} Current status data
   */
  async getCurrentStatus() {
    return await this.client.get("/api/readings/current");
  }

  /**
   * Get historical readings
   * @param {number} limit - Number of readings to fetch
   * @returns {Promise<Object>} Historical data
   */
  async getHistory(limit = 50) {
    return await this.client.get("/api/readings/history", {
      params: { limit },
    });
  }

  /**
   * Get statistics
   * @param {number} hours - Time range in hours
   * @returns {Promise<Object>} Statistics data
   */
  async getStats(hours = 24) {
    return await this.client.get("/api/readings/stats", {
      params: { hours },
    });
  }

  /**
   * Get all devices (admin)
   * @returns {Promise<Object>} { success, count, devices }
   */
  async getDevices() {
    return await this.client.get("/admin/devices");
  }

  /**
   * Create a new device (admin)
   * @param {Object} data - { name, imei }
   * @returns {Promise<Object>} Created device data
   */
  async createDevice(data) {
    return await this.client.post("/admin/devices", data);
  }
}

// Export singleton instance
export default new ApiService();
