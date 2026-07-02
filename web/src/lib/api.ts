export const API_URL = "http://localhost:8080/api/v1";
export const WS_URL = "ws://localhost:8080/api/v1";

export function getAuthToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("accessToken");
  }
  return null;
}

export function getRefreshToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("refreshToken");
  }
  return null;
}

export function setAuthToken(token: string, refreshToken?: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("accessToken", token);
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }
  }
}

export function clearAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export async function fetchApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  headers.set("Content-Type", "application/json");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message === 'Failed to fetch') {
      throw new Error("Network error: Unable to reach the server. Please check your connection.");
    }
    throw err;
  }

  if (response.status === 401) {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearAuthToken();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith('/auth')) {
        window.location.href = "/";
      }
      throw new Error("Unauthorized");
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshSubscribers.push((newToken) => {
          headers.set("Authorization", `Bearer ${newToken}`);
          resolve(
            fetch(`${API_URL}${endpoint}`, { ...options, headers })
              .then(r => r.json())
              .catch(() => { throw new Error("Network error: Unable to reach the server."); })
          );
        });
      });
    }

    isRefreshing = true;
    try {
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!refreshRes.ok) {
        throw new Error("Session expired");
      }

      const refreshData = await refreshRes.json();
      setAuthToken(refreshData.access_token, refreshData.refresh_token);
      onRefreshed(refreshData.access_token);
      isRefreshing = false;

      // Retry original request
      headers.set("Authorization", `Bearer ${refreshData.access_token}`);
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (err: any) {
      isRefreshing = false;
      refreshSubscribers = [];
      clearAuthToken();
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        throw new Error("Network error: Unable to reach the server.");
      }
      throw new Error("Session expired. Please log in again.");
    }
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP Error ${response.status}`);
  }

  // Check if response is empty before parsing JSON
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}
