import { createContext, useContext, useState, useEffect } from "react";
import { loginUser, registerUser, getCurrentUser } from "../service/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("auth_token"));
  const [loading, setLoading] = useState(true);

  // Validate token on mount or token change
  useEffect(() => {
    async function verifyAuth() {
      const storedToken = localStorage.getItem("auth_token");

      if (!storedToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await getCurrentUser();
        if (response.success && response.user) {
          setUser(response.user);
          setToken(storedToken);
        } else {
          logout();
        }
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    }

    verifyAuth();
  }, []);

  const login = async (email, password) => {
    const data = await loginUser({ email, password });
    if (data.success && data.token && data.user) {
      localStorage.setItem("auth_token", data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } else {
      throw new Error(data.message || "Login failed");
    }
  };

  const register = async (userData) => {
    return await registerUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: Boolean(user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
