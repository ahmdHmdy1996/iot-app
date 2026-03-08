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
   * Register a new CLIENT user
   * @param {Object} data - { username, password }
   * @returns {Promise<Object>} { success, token, user }
   */
  async register(data) {
    return await this.client.post("/auth/register", data);
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
  async getHistory(
    imei,
    { limit = 50, startDate = null, endDate = null } = {},
  ) {
    const params = {};
    if (startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    } else {
      params.limit = limit;
    }
    return await this.client.get(`/api/readings/${imei}`, { params });
  }

  /**
   * Get daily stats (max, min, avg temperature) for the current day (backend aggregates all readings for today).
   * @param {string} imei
   * @returns {Promise<{ success: boolean, stats: { maxTemp, minTemp, avgTemp } }>}
   */
  async getDeviceStats(imei) {
    return await this.client.get(`/api/devices/${imei}/stats`);
  }

  /**
   * Get device dashboard: device meta, current reading, daily stats, and chart data in one response.
   * @param {string} imei
   * @returns {Promise<{ success: boolean, device, currentReading, dailyStats, chartData }>}
   */
  async getDeviceDashboard(imei) {
    return await this.client.get(`/api/devices/${imei}/dashboard`);
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
   * Super Admin: Get all users (GET /api/admin/users, includes _count.devices)
   */
  async getAllUsers() {
    return await this.client.get("/api/admin/users");
  }

  /**
   * Super Admin: Get all devices in the whole system (GET /api/admin/devices)
   */
  async getAllSystemDevices() {
    return await this.client.get("/api/admin/devices");
  }

  /**
   * Super Admin: Get aggregated system stats (GET /api/admin/stats)
   */
  async getSystemStats() {
    return await this.client.get("/api/admin/stats");
  }

  /**
   * Super Admin: Create user (POST /api/admin/users)
   */
  async createUserSuperAdmin(data) {
    return await this.client.post("/api/admin/users", data);
  }

  /**
   * Super Admin: Update user (PATCH /api/admin/users/:id)
   */
  async updateUser(id, data) {
    return await this.client.patch(`/api/admin/users/${id}`, data);
  }

  /**
   * Super Admin: Delete user (DELETE /api/admin/users/:id)
   */
  async deleteUser(id) {
    return await this.client.delete(`/api/admin/users/${id}`);
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
    // Backend endpoint is /admin/devices/assign
    return await this.client.post("/admin/devices/assign", data);
  }

  /**
   * Admin: Create Device (Legacy but kept)
   */
  async createDevice(data) {
    return await this.client.post("/admin/devices", data);
  }

  /**
   * Client: Add my device (self-service, enforces maxDevices)
   */
  async addMyDevice(data) {
    return await this.client.post("/api/my-devices/add", data);
  }

  /**
   * Client: Update own device (name, minTemp, maxTemp, calibrationOffset, isActive)
   */
  async updateMyDevice(imei, data) {
    return await this.client.patch(`/api/my-devices/${imei}`, data);
  }

  /**
   * Client: Delete own device
   */
  async deleteMyDevice(imei) {
    return await this.client.delete(`/api/my-devices/${imei}`);
  }

  /**
   * Admin: Update Device (minTemp, maxTemp, calibrationOffset, name, isActive)
   */
  async updateDevice(imei, data) {
    return await this.client.patch(`/admin/devices/${imei}`, data);
  }

  /**
   * Admin: Delete device
   */
  async deleteDevice(imei) {
    return await this.client.delete(`/admin/devices/${imei}`);
  }

  /**
   * Get current user's settings (for loading the Settings form)
   * Returns plan, maxDevices, deviceCount, apiToken, and notification prefs
   */
  async getCurrentUserSettings() {
    return await this.client.get("/api/user/settings");
  }

  /**
   * Generate a new API token for the current user (external integrations)
   * @returns {Promise<{ success: boolean, apiToken: string }>}
   */
  async generateApiToken() {
    return await this.client.post("/api/user/generate-token");
  }

  /**
   * Update current user's settings (webhook, alert email/WhatsApp and toggles)
   */
  async updateUserSettings(data) {
    return await this.client.put("/api/user/settings", data);
  }

  /**
   * Client: Get own profile (username, plan, alertEmail)
   */
  async getProfile() {
    return await this.client.get("/api/users/me");
  }

  /**
   * Client: Update own profile (alertEmail, password)
   */
  async updateProfile(data) {
    return await this.client.patch("/api/users/me", data);
  }

  /**
   * Get alert log history for a device
   */
  async getAlerts(imei, limit = 50) {
    return await this.client.get(`/api/alerts/${imei}`, {
      params: { limit },
    });
  }

  /**
   * Clear all alert logs for a device (DELETE /api/alerts/:imei)
   */
  async clearAlerts(imei) {
    return await this.client.delete(`/api/alerts/${imei}`);
  }

  /**
   * Get audit report for a device (readings + alerts in date range)
   */
  async getAuditReport(imei, from, to) {
    return await this.client.get(`/api/audit-report/${imei}`, {
      params: {
        from: from instanceof Date ? from.toISOString() : from,
        to: to instanceof Date ? to.toISOString() : to,
      },
    });
  }

  /**
   * Admin: Assign Device (Legacy naming, maybe same endpoint?)
   * The user request said: POST /admin/assign-device
   * So I will use assignDeviceToUser for that.
   */
  async assignDevice(data) {
    return await this.client.post("/admin/devices/assign", data);
  }

  /**
   * Admin: Update a user's plan and/or maxDevices
   * @param {number} userId
   * @param {{ plan?: 'BASIC'|'PRO', maxDevices?: number }} data
   */
  async updateUserPlan(userId, data) {
    return await this.client.patch(`/admin/users/${userId}/plan`, data);
  }

  /**
   * Admin: Delete a user by ID
   * @param {number} id
   */
  async deleteAdminUser(id) {
    return await this.client.delete(`/admin/users/${id}`);
  }

  /**
   * Super Admin: Get system-wide settings (GET /api/admin/settings)
   */
  async getSystemSettings() {
    return await this.client.get("/api/admin/settings");
  }

  /**
   * Super Admin: Update system-wide settings (PATCH /api/admin/settings)
   */
  async updateSystemSettings(data) {
    return await this.client.patch("/api/admin/settings", data);
  }
}

export default new ApiService();
