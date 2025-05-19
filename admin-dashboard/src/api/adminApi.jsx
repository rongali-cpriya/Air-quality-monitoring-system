import axios from "axios";
import { jwtDecode } from "jwt-decode";

const adminApi = axios.create({
  baseURL: "http://localhost:8002/", // Ensure trailing slash
  headers: { "Content-Type": "application/json" },
});

// Request Interceptor: Add JWT token to headers
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 errors and redirect
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("adminToken");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Utility to decode and validate token
export const getTokenData = () => {
  const token = localStorage.getItem("adminToken");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    // Check token expiration
    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("adminToken");
      return null;
    }
    return decoded;
  } catch (error) {
    console.error("Invalid token:", error);
    localStorage.removeItem("adminToken");
    return null;
  }
};

const AdminService = {
  // Authentication
  login: async (credentials) => {
    const params = new URLSearchParams();
    params.append("username", credentials.username);
    params.append("password", credentials.password);
    params.append("grant_type", "password");

    const response = await adminApi.post("/auth/token", params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response.data;
  },

  // Users
  getUsers: async () => {
    const response = await adminApi.get("/users");
    return response.data;
  },
  createUser: async (userData) => {
    const response = await adminApi.post("/users", userData);
    return response.data;
  },
  updateUser: async (userId, userData) => {
    const response = await adminApi.patch(`/users/${userId}`, userData);
    return response.data;
  },
  deleteUser: async (userId) => {
    const response = await adminApi.delete(`/users/${userId}`);
    return response.data;
  },

  // Stations
  getStations: async () => {
    const response = await adminApi.get("/stations");
    return response.data;
  },
  createStation: async (stationData) => {
    const response = await adminApi.post("/stations", stationData);
    return response.data;
  },
  updateStation: async (stationId, stationData) => {
    const response = await adminApi.patch(`/stations/${stationId}`, stationData);
    return response.data;
  },
  deleteStation: async (stationId) => {
    const response = await adminApi.delete(`/stations/${stationId}`);
    return response.data;
  },

  // Contributions
  getContributions: async (status = "pending") => {
    const response = await adminApi.get(`/contributions?status_filter=${status}`);
    return response.data;
  },
  approveContribution: async (contributionId, newStatus) => {
    try {
      const response = await adminApi.patch(
        `/contributions/${contributionId}`,
        JSON.stringify(newStatus)
      );
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  },

  // Notifications
  sendNotification: async (notificationData) => {
    const response = await adminApi.post("/notifications/send", notificationData);
    return response.data;
  },

  // Measurements
  getMeasurements: async (params = {}) => {
    const response = await adminApi.get("/measurements", { params });
    return response.data;
  },
  deleteMeasurement: async (measurementId) => {
    const response = await adminApi.delete(`/measurements/${measurementId}`);
    return response.data;
  },

  getCriticalMeasurements: async (aqiThreshold = 100) => {
    const response = await adminApi.get("/measurements", { params: { aqi_gt: aqiThreshold } });
    return response.data;
  },

  // Feedback
  getFeedbacks: async (params = {}) => {
    const response = await adminApi.get("/feedback/", { params }); // Ensure trailing slash
    console.log("getFeedbacks Response:", response); // Debug
    return response.data;
  },
};

export default AdminService;