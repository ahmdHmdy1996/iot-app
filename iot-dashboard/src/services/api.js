import axios from "axios";
import { API_BASE_URL, AUTH_TOKEN_KEY } from "../config/constants";

/**
 * API Service for Backend Communication
 */
class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor: attach JWT when present
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response) {
          if (error.response.status === 401) {
            // Optional: Auto-logout logic
            // localStorage.removeItem(AUTH_TOKEN_KEY);
            // window.location.href = "/login";
            return Promise.reject(new Error("Unauthorized. Please log in."));
          }
          throw new Error(error.response.data?.message || "Server error");
        } else if (error.request) {
          throw new Error("No response from server. Check connection.");
        } else {
          throw new Error(error.message);
        }
      },
    );
  }

  /**
   * Login
   * @param {Object} credentials - { username, password }
   * @returns {Promise<Object>} { success, token, user }
   */
  async login(credentials) {
    return await this.client.post("/auth/login", credentials);
  }

  /**
   * Get Devices (Context-aware based on Role)
   * Check localStorage for user role
   * @returns {Promise<Object>} { success, data: [...] }
   */
  async getDevices() {
    const userStr = localStorage.getItem("user");
    let role = "CLIENT";
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        role = user.role || "CLIENT";
      } catch (e) {
        console.error("Error parsing user from localStorage", e);
      }
    }

    if (role === "ADMIN") {
      return await this.client.get("/admin/devices");
    } else {
      return await this.client.get("/api/my-devices");
    }
  }

  /**
   * Get current reading (Client)
   * @param {string} imei
   */
  async getReading(imei) {
    // The backend route is /api/readings/:imei
    return await this.client.get(`/api/readings/${imei}?limit=1`);
  }

  /**
   * Get history (Client)
   * @param {string} imei
   * @param {number} limit
   */
  async getHistory(imei, limit = 50) {
    // The backend route is /api/readings/:imei?limit=X
    // But looking at previous api.js, getHistory was /api/readings/history (legacy)
    // New backend refactor created: GET /api/readings/:imei
    // So we should use that.
    return await this.client.get(`/api/readings/${imei}`, {
      params: { limit },
    });
  }

  // Legacy support for Stats if needed, or remove if unused.
  // The new backend didn't explicitly implement stats endpoint yet in the refactor plan?
  // Checking api.js in backend... only "my-devices" and "readings/:imei".
  // "stats" endpoint was removed/not ported in previous turn?
  // Wait, I replaced `src/routes/api.js` entirely.
  // The new `src/routes/api.js` ONLY has `GET /my-devices` and `GET /readings/:imei`.
  // So `getStats` is broken/missing in backend.
  // I should probably remove it from frontend for now or handle it.

  /**
   * Admin: Get Users
   */
  async getUsers() {
    return await this.client.get("/admin/users");
  }

  /**
   * Admin: Create User
   */
  async createUser(data) {
    return await this.client.post("/admin/users", data);
  }

  /**
   * Admin: Assign Device to User
   */
  async assignDeviceToUser(data) {
    return await this.client.post("/admin/assign-device", data);
  }

  /**
   * Admin: Create Device (Legacy but kept)
   */
  async createDevice(data) {
    return await this.client.post("/admin/devices", data);
  }

  /**
   * Admin: Assign Device (Legacy naming, maybe same endpoint?)
   * The user request said: POST /admin/assign-device
   * So I will use assignDeviceToUser for that.
   */
  async assignDevice(data) {
    return await this.client.post("/admin/devices/assign", data);
  }
}

export default new ApiService();
