import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import api, { getApiError } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("access_token");
    if (!token) {
      setReady(true);
      return () => { active = false; };
    }
    api.get<User>("/me")
      .then(({ data }) => { if (active) setUser(data); })
      .catch(() => {
        localStorage.removeItem("access_token");
        if (active) setUser(null);
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const body = new URLSearchParams();
    body.set("username", email);
    body.set("password", password);
    try {
      const { data } = await api.post<{ access_token: string; token_type: string }>("/login", body);
      localStorage.setItem("access_token", data.access_token);
      const profile = await api.get<User>("/me");
      setUser(profile.data);
      return profile.data;
    } catch (error) {
      localStorage.removeItem("access_token");
      setUser(null);
      throw new Error(getApiError(error));
    }
  }, []);

  const register = useCallback(async (email: string, password: string, role: string) => {
    try {
      await api.post("/register", { email, password, role });
    } catch (error) {
      throw new Error(getApiError(error));
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, register, logout }), [user, ready, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
