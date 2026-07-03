"use client";

import { createContext, useContext, useState } from "react";
import { getAuthToken, clearAuthToken, fetchApi } from "../lib/api";

type User = {
  id: string;
  email: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (token: string, u: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const token = getAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return {
          id: payload.user_id,
          email: payload.email || "",
          role: payload.role,
        };
      } catch {
        clearAuthToken();
      }
    }
    return null;
  });
  const [loading] = useState(false);

  const login = (token: string, u: User) => {
    // Note: setAuthToken is now handled in api.ts or page.tsx 
    // We just set the user in context here.
    setUser(u);
  };

  const logout = async () => {
    const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
    if (refreshToken) {
      try {
        await fetchApi("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refreshToken })
        });
      } catch (err) {
        console.error("Logout error", err);
      }
    }
    clearAuthToken();
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
