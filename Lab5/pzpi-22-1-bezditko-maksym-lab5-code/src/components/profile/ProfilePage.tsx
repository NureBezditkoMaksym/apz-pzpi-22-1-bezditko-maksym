import React, { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Avatar,
  Typography,
  Row,
  Col,
  Switch,
  Alert,
  Space,
  Divider,
  Tag,
  Statistic,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import type { Tables, TablesUpdate } from "../../types/supabase";

const { Title, Text } = Typography;

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [userProfile, setUserProfile] = useState<Tables<"users"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalMetrics: 0,
    totalReports: 0,
    joinDate: "",
  });

  // Fetch user profile and stats
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", user.id)
          .single();

        if (profileError) {
          setError("Failed to load profile");
          return;
        }

        setUserProfile(profile);
        form.setFieldsValue({
          username: profile.username,
          email: profile.email,
          phone: profile.phone || "",
          is_premium: profile.is_premium || false,
        });

        // Fetch user stats
        const [metricsResult, reportsResult] = await Promise.all([
          supabase
            .from("health_metrics")
            .select("metric_id", { count: "exact" })
            .eq("user_id", profile.id),
          supabase
            .from("reports")
            .select("report_id", { count: "exact" })
            .eq("user_id", profile.id),
        ]);

        setStats({
          totalMetrics: metricsResult.count || 0,
          totalReports: reportsResult.count || 0,
          joinDate: profile.created_at
            ? new Date(profile.created_at).toLocaleDateString()
            : "Unknown",
        });
      } catch (err) {
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, form]);

  const handleSave = async (values: any) => {
    if (!userProfile) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData: TablesUpdate<"users"> = {
        username: values.username,
        phone: values.phone || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userProfile.id);

      if (error) {
        setError(error.message);
      } else {
        setSuccess("Profile updated successfully!");
        setEditing(false);
        // Refresh profile data
        const { data: updatedProfile } = await supabase
          .from("users")
          .select("*")
          .eq("id", userProfile.id)
          .single();

        if (updatedProfile) {
          setUserProfile(updatedProfile);
        }
      }
    } catch (err) {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
    setSuccess(null);
    if (userProfile) {
      form.setFieldsValue({
        username: userProfile.username,
        email: userProfile.email,
        phone: userProfile.phone || "",
        is_premium: userProfile.is_premium || false,
      });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Text>Loading profile...</Text>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Alert
          message="Profile Not Found"
          description="Unable to load your profile information."
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <Title level={2}>Profile Settings</Title>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {success && (
        <Alert
          message="Success"
          description={success}
          type="success"
          showIcon
          closable
          onClose={() => setSuccess(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[24, 24]}>
        {/* Profile Information */}
        <Col xs={24} lg={16}>
          <Card
            title="Personal Information"
            extra={
              !editing ? (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => setEditing(true)}
                >
                  Edit Profile
                </Button>
              ) : (
                <Space>
                  <Button icon={<CloseOutlined />} onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={() => form.submit()}
                  >
                    Save Changes
                  </Button>
                </Space>
              )
            }
          >
            <div style={{ marginBottom: 24, textAlign: "center" }}>
              <Avatar size={80} icon={<UserOutlined />} />
              <div style={{ marginTop: 16 }}>
                <Title level={4} style={{ margin: 0 }}>
                  {userProfile.username}
                </Title>
                <Text type="secondary">{userProfile.email}</Text>
                {userProfile.is_premium && (
                  <div style={{ marginTop: 8 }}>
                    <Tag color="gold">Premium Member</Tag>
                  </div>
                )}
              </div>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
              disabled={!editing}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="username"
                    label="Username"
                    rules={[
                      { required: true, message: "Username is required" },
                      {
                        min: 3,
                        message: "Username must be at least 3 characters",
                      },
                    ]}
                  >
                    <Input prefix={<UserOutlined />} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="email" label="Email">
                    <Input
                      prefix={<MailOutlined />}
                      disabled
                      style={{ backgroundColor: "#f5f5f5" }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="phone" label="Phone Number">
                    <Input
                      prefix={<PhoneOutlined />}
                      placeholder="Enter phone number"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="is_premium"
                    label="Premium Status"
                    valuePropName="checked"
                  >
                    <Switch disabled />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        {/* Profile Stats */}
        <Col xs={24} lg={8}>
          <Card title="Account Statistics">
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <Statistic
                title="Health Metrics Recorded"
                value={stats.totalMetrics}
                prefix={<UserOutlined />}
              />
              <Divider />
              <Statistic
                title="Reports Generated"
                value={stats.totalReports}
                prefix={<UserOutlined />}
              />
              <Divider />
              <div>
                <Text type="secondary">Member Since</Text>
                <div>
                  <Text strong>{stats.joinDate}</Text>
                </div>
              </div>
              <Divider />
              <div>
                <Text type="secondary">Account Status</Text>
                <div>
                  <Tag color={userProfile.is_premium ? "gold" : "blue"}>
                    {userProfile.is_premium ? "Premium" : "Free"}
                  </Tag>
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProfilePage;
