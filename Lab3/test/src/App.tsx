import React, { useState } from "react";
import { ConfigProvider, Spin } from "antd";
import { useAuth } from "./hooks/useAuth";
import LoginScreen from "./components/auth/LoginScreen";
import SignUpScreen from "./components/auth/SignUpScreen";
import DashboardScreen from "./components/dashboard/DashboardScreen";

// Ant Design theme configuration
const theme = {
  token: {
    colorPrimary: "#1890ff",
    borderRadius: 8,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
};

type AuthView = "login" | "signup" | "forgot-password";

function App() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState<AuthView>("login");

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <ConfigProvider theme={theme}>
        <div
          style={{
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          }}
        >
          <Spin size="large" />
        </div>
      </ConfigProvider>
    );
  }

  // If user is authenticated, show dashboard
  if (user) {
    return (
      <ConfigProvider theme={theme}>
        <DashboardScreen />
      </ConfigProvider>
    );
  }

  // If user is not authenticated, show auth screens
  const renderAuthScreen = () => {
    switch (authView) {
      case "signup":
        return <SignUpScreen onSwitchToLogin={() => setAuthView("login")} />;
      case "forgot-password":
        // For now, redirect back to login
        // You can implement a forgot password screen here
        setAuthView("login");
        return (
          <LoginScreen
            onSwitchToSignUp={() => setAuthView("signup")}
            onSwitchToForgotPassword={() => setAuthView("forgot-password")}
          />
        );
      case "login":
      default:
        return (
          <LoginScreen
            onSwitchToSignUp={() => setAuthView("signup")}
            onSwitchToForgotPassword={() => setAuthView("forgot-password")}
          />
        );
    }
  };

  return <ConfigProvider theme={theme}>{renderAuthScreen()}</ConfigProvider>;
}

export default App;
