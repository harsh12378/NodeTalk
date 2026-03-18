// utils/api.js
import API_BASE_URL from "../config";

const api = {
  get: async (endpoint) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },

  post: async (endpoint, data) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },
};

export default api;
