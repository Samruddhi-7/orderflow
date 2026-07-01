"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getAuthToken, clearAuthToken, setAuthToken, fetchApi } from "../lib/api";

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      // Decode JWT slightly or just fetch a protected route to see if it's valid.
      // We don't have a /me route, but we can decode the JWT payload easily.
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser({
          id: payload.user_id,
          email: payload.email || "", // Not strictly in payload, but good enough
          role: payload.role,
        });
      } catch (e) {
        clearAuthToken();
      }
    }
    setLoading(false);
  }, []);

  const login = (token: string, u: User) => {
    setAuthToken(token);
    setUser(u);
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
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
