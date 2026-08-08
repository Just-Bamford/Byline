import React, { useState, useEffect } from "react";
import { LoginPage } from "./pages/Login";

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    try {
      // Check if user is already authenticated
      const token = localStorage.getItem("auth_token");
      const address = localStorage.getItem("publisher_address");

      setIsAuthenticated(!!(token && address));
    } catch (e) {
      console.error("Auth check error:", e);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  if (isCheckingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#4b5563" }}>Loading...</div>
      </div>
    );
  }

  // For now, always show login page
  return <LoginPage />;
};

export default App;
