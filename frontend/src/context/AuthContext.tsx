import React, { createContext, useContext, useState, useEffect } from "react";
import { authStorage, StoredUser } from "../utils/authStorage";
import { api } from "../api/client";

interface AuthContextType {
  user: StoredUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateWeights: (weights: {
    weightTasks: number;
    weightFocus: number;
    weightHabits: number;
    dailyFocusTargetMin?: number;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StoredUser | null>(() => authStorage.getUser());
  const [token, setToken] = useState<string | null>(() => authStorage.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function verifySession() {
      const storedToken = authStorage.getToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.get("/user/profile");
        if (res.data.success && res.data.user) {
          setUser(res.data.user);
          authStorage.setUser(res.data.user);
        }
      } catch {
        authStorage.clear();
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    }

    verifySession();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    if (res.data.success) {
      const { token: receivedToken, user: receivedUser } = res.data;
      setToken(receivedToken);
      setUser(receivedUser);
      authStorage.setToken(receivedToken);
      authStorage.setUser(receivedUser);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post("/auth/register", { name, email, password });
    if (res.data.success) {
      const { token: receivedToken, user: receivedUser } = res.data;
      setToken(receivedToken);
      setUser(receivedUser);
      authStorage.setToken(receivedToken);
      authStorage.setUser(receivedUser);
    }
  };

  const logout = () => {
    authStorage.clear();
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  };

  const updateWeights = async (weights: {
    weightTasks: number;
    weightFocus: number;
    weightHabits: number;
    dailyFocusTargetMin?: number;
  }) => {
    const res = await api.put("/user/weights", weights);
    if (res.data.success && res.data.user) {
      setUser(res.data.user);
      authStorage.setUser(res.data.user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        updateWeights,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
