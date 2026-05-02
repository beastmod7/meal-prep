import React, { createContext, useContext, useEffect, useState } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  activeRestaurantId: string | null;
  setActiveRestaurantId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  setToken: () => {},
  activeRestaurantId: null,
  setActiveRestaurantId: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => {
    return localStorage.getItem("restaurant_portal_token");
  });
  
  const [activeRestaurantId, setActiveRestaurantIdState] = useState<string | null>(() => {
    return localStorage.getItem("restaurant_portal_active_id");
  });

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem("restaurant_portal_token", newToken);
    } else {
      localStorage.removeItem("restaurant_portal_token");
    }
  };

  const setActiveRestaurantId = (id: string | null) => {
    setActiveRestaurantIdState(id);
    if (id) {
      localStorage.setItem("restaurant_portal_active_id", id);
    } else {
      localStorage.removeItem("restaurant_portal_active_id");
    }
  };

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("restaurant_portal_token"));
  }, []);

  return (
    <AuthContext.Provider value={{ token, setToken, activeRestaurantId, setActiveRestaurantId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
