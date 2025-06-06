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
  Progress,
} from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";

const { Title, Text, Link } = Typography;

interface SignUpScreenProps {
  onSwitchToLogin: () => void;
}

interface SignUpFormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({ onSwitchToLogin }) => {
  const { signUp } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    return strength;
  };

  const getPasswordStrengthColor = (strength: number): string => {
    if (strength < 50) return "#ff4d4f";
    if (strength < 75) return "#faad14";
    return "#52c41a";
  };

  const getPasswordStrengthText = (strength: number): string => {
    if (strength < 25) return "Very Weak";
    if (strength < 50) return "Weak";
    if (strength < 75) return "Good";
    return "Strong";
  };

  const handleSubmit = async (values: SignUpFormData) => {
    setLoading(true);
    setError(null);

    try {
      const { user, error: authError } = await signUp({
        email: values.email,
        password: values.password,
        username: values.username,
      });

      if (authError) {
        setError(authError.message);
      } else if (user) {
        setSuccess(true);
        form.resetFields();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const passwordValue = Form.useWatch("password", form) || "";
  const passwordStrength = getPasswordStrength(passwordValue);

  if (success) {
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
            textAlign: "center",
          }}
          bodyStyle={{ padding: "40px" }}
        >
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div>
              <Title level={2} style={{ color: "#52c41a" }}>
                Account Created!
              </Title>
              <Text type="secondary">
                Please check your email to verify your account before signing
                in.
              </Text>
            </div>
            <Button
              type="primary"
              size="large"
              block
              onClick={onSwitchToLogin}
              style={{
                height: 48,
                fontSize: 16,
                borderRadius: 8,
              }}
            >
              Go to Sign In
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

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
              Create Account
            </Title>
            <Text type="secondary">Join us today</Text>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              message="Sign Up Failed"
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
            />
          )}

          {/* Sign Up Form */}
          <Form
            form={form}
            name="signup"
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
              name="username"
              label="Username"
              rules={[
                { required: true, message: "Please input your username!" },
                {
                  min: 3,
                  message: "Username must be at least 3 characters!",
                },
                {
                  max: 20,
                  message: "Username must be less than 20 characters!",
                },
                {
                  pattern: /^[a-zA-Z0-9_]+$/,
                  message:
                    "Username can only contain letters, numbers, and underscores!",
                },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Choose a username"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Please input your password!" },
                { min: 8, message: "Password must be at least 8 characters!" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Create a password"
                autoComplete="new-password"
              />
            </Form.Item>

            {/* Password Strength Indicator */}
            {passwordValue && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Password Strength
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: getPasswordStrengthColor(passwordStrength),
                    }}
                  >
                    {getPasswordStrengthText(passwordStrength)}
                  </Text>
                </div>
                <Progress
                  percent={passwordStrength}
                  showInfo={false}
                  strokeColor={getPasswordStrengthColor(passwordStrength)}
                  size="small"
                />
              </div>
            )}

            <Form.Item
              name="confirmPassword"
              label="Confirm Password"
              dependencies={["password"]}
              rules={[
                { required: true, message: "Please confirm your password!" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("The passwords do not match!")
                    );
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm your password"
                autoComplete="new-password"
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
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </Form.Item>
          </Form>

          <Divider>
            <Text type="secondary">Already have an account?</Text>
          </Divider>

          {/* Sign In Link */}
          <Button
            type="default"
            block
            size="large"
            onClick={onSwitchToLogin}
            style={{
              height: 48,
              fontSize: 16,
              borderRadius: 8,
              borderColor: "#1890ff",
              color: "#1890ff",
            }}
          >
            Sign In
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default SignUpScreen;
