export const API_URL = "http://localhost:8080/api/v1";
export const WS_URL = "ws://localhost:8080/api/v1";

export function getAuthToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("accessToken");
  }
  return null;
}

export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("accessToken", token);
  }
}

export function clearAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
  }
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP Error ${response.status}`);
  }

  return response.json();
}
