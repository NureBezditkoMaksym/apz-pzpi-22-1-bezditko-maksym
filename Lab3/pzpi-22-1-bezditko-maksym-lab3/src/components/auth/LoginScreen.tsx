import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Alert,
  Space,
  Divider,
} from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";

const { Title, Text, Link } = Typography;

interface LoginScreenProps {
  onSwitchToSignUp: () => void;
  onSwitchToForgotPassword: () => void;
}

interface LoginFormData {
  email: string;
  password: string;
}

const LoginScreen: React.FC<LoginScreenProps> = ({
  onSwitchToSignUp,
  onSwitchToForgotPassword,
}) => {
  const { signIn } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: LoginFormData) => {
    setLoading(true);
    setError(null);

    try {
      const { user, error: authError } = await signIn({
        email: values.email,
        password: values.password,
      });

      if (authError) {
        setError(authError.message);
      } else if (user) {
        // Success - user will be redirected by the auth state change
        console.log("Login successful");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "20px",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          borderRadius: "16px",
        }}
        bodyStyle={{ padding: "40px" }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Header */}
          <div style={{ textAlign: "center" }}>
            <Title level={2} style={{ marginBottom: 8, color: "#1890ff" }}>
              Welcome Back
            </Title>
            <Text type="secondary">Sign in to your account</Text>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              message="Login Failed"
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
            />
          )}

          {/* Login Form */}
          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
            autoComplete="off"
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Please input your email!" },
                { type: "email", message: "Please enter a valid email!" },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="Enter your email"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Please input your password!" },
                { min: 6, message: "Password must be at least 6 characters!" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 48,
                  fontSize: 16,
                  borderRadius: 8,
                }}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </Form.Item>
          </Form>

          {/* Forgot Password Link */}
          <div style={{ textAlign: "center" }}>
            <Link onClick={onSwitchToForgotPassword}>
              Forgot your password?
            </Link>
          </div>

          <Divider>
            <Text type="secondary">New to our platform?</Text>
          </Divider>

          {/* Sign Up Link */}
          <Button
            type="default"
            block
            size="large"
            onClick={onSwitchToSignUp}
            style={{
              height: 48,
              fontSize: 16,
              borderRadius: 8,
              borderColor: "#1890ff",
              color: "#1890ff",
            }}
          >
            Create Account
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default LoginScreen;
