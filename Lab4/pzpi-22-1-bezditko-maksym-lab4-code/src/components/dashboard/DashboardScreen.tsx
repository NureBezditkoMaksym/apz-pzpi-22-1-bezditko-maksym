import React, { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Space,
  Progress,
  List,
  Tag,
} from "antd";
import {
  UserOutlined,
  DashboardOutlined,
  HeartOutlined,
  BellOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
  TrophyOutlined,
  FireOutlined,
  ThunderboltOutlined,
  StepForwardOutlined,
  CrownOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";
import { useAdmin } from "../../hooks/useAdmin";
import { supabase } from "../../lib/supabase";
import type { Tables } from "../../types/supabase";
import ProfilePage from "../profile/ProfilePage";
import HealthMetricsPage from "../health/HealthMetricsPage";
import ReportsPage from "../reports/ReportsPage";
import NotificationsPopup from "../notifications/NotificationsPopup";
import NotificationsPage from "../notifications/NotificationsPage";
import RoleManagementPage from "../admin/RoleManagementPage";
import DatabaseManagementPage from "../admin/DatabaseManagementPage";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

interface DashboardScreenProps {}

const DashboardScreen: React.FC<DashboardScreenProps> = () => {
  const { user, signOut } = useAuth();
  const { isAdmin, isDataAnalyst, loading: adminLoading } = useAdmin();
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState("dashboard");
  const [userProfile, setUserProfile] = useState<Tables<"users"> | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<
    Tables<"health_metrics">[]
  >([]);
  const [notifications, setNotifications] = useState<Tables<"notifications">[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        // Fetch user profile
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", user.id)
          .single();

        if (profile) {
          setUserProfile(profile);

          // Fetch recent health metrics
          const { data: metrics } = await supabase
            .from("health_metrics")
            .select("*")
            .eq("user_id", profile.id)
            .order("date", { ascending: false })
            .limit(7);

          setHealthMetrics(metrics || []);

          // Fetch recent notifications
          const { data: notifs } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", profile.id)
            .order("sent_at", { ascending: false })
            .limit(5);

          setNotifications(notifs || []);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
  };

  // Calculate health stats
  const todayMetrics = healthMetrics[0];
  const weeklyMetrics = healthMetrics.slice(0, 7);
  const totalSteps = weeklyMetrics.reduce(
    (sum, metric) => sum + (metric.steps || 0),
    0
  );
  const avgCalories =
    weeklyMetrics.reduce((sum, metric) => sum + (metric.calories || 0), 0) /
    (weeklyMetrics.length || 1);
  const totalWater = weeklyMetrics.reduce(
    (sum, metric) => sum + (metric.water_ml || 0),
    0
  );

  // User dropdown menu
  const userMenu = (
    <Menu>
      <Menu.Item
        key="profile"
        icon={<UserOutlined />}
        onClick={() => setSelectedKey("profile")}
      >
        Profile
      </Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        Settings
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="logout"
        icon={<LogoutOutlined />}
        onClick={handleSignOut}
        danger
      >
        Sign Out
      </Menu.Item>
    </Menu>
  );

  // Sidebar menu items (conditionally include admin and data analyst menus)
  const menuItems = [
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
    },
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
    },
    {
      key: "health",
      icon: <HeartOutlined />,
      label: "Health Metrics",
    },
    {
      key: "reports",
      icon: <FileTextOutlined />,
      label: "Reports",
    },
    {
      key: "notifications",
      icon: <BellOutlined />,
      label: "Notifications",
    },
    // Only show admin menu if user is admin
    ...(isAdmin
      ? [
          {
            key: "admin",
            icon: <CrownOutlined />,
            label: "Role Management",
          },
        ]
      : []),
    // Only show database management if user is data analyst
    ...(isDataAnalyst
      ? [
          {
            key: "database",
            icon: <DatabaseOutlined />,
            label: "Database Management",
          },
        ]
      : []),
  ];

  const renderDashboardContent = () => (
    <div>
      {/* Welcome Section */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          Welcome back, {userProfile?.username || "User"}!
          {isAdmin && (
            <Tag color="red" style={{ marginLeft: 8 }}>
              Admin
            </Tag>
          )}
          {isDataAnalyst && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              Data Analyst
            </Tag>
          )}
        </Title>
        <Text type="secondary">
          Here's your health overview for today and this week.
        </Text>
      </div>

      {/* Today's Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Steps Today"
              value={todayMetrics?.steps || 0}
              prefix={<StepForwardOutlined style={{ color: "#1890ff" }} />}
              suffix="steps"
            />
            <Progress
              percent={Math.min(
                ((todayMetrics?.steps || 0) / 10000) * 100,
                100
              )}
              showInfo={false}
              strokeColor="#1890ff"
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Calories Today"
              value={todayMetrics?.calories || 0}
              prefix={<FireOutlined style={{ color: "#ff7875" }} />}
              suffix="kcal"
            />
            <Progress
              percent={Math.min(
                ((todayMetrics?.calories || 0) / 2000) * 100,
                100
              )}
              showInfo={false}
              strokeColor="#ff7875"
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Water Today"
              value={todayMetrics?.water_ml || 0}
              prefix={<ThunderboltOutlined style={{ color: "#40a9ff" }} />}
              suffix="ml"
            />
            <Progress
              percent={Math.min(
                ((todayMetrics?.water_ml || 0) / 2000) * 100,
                100
              )}
              showInfo={false}
              strokeColor="#40a9ff"
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Weekly Goal"
              value={Math.round((totalSteps / 70000) * 100)}
              prefix={<TrophyOutlined style={{ color: "#faad14" }} />}
              suffix="%"
            />
            <Progress
              percent={Math.min((totalSteps / 70000) * 100, 100)}
              showInfo={false}
              strokeColor="#faad14"
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* Weekly Overview */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Weekly Overview" style={{ height: 400 }}>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic
                  title="Total Steps"
                  value={totalSteps}
                  suffix="steps"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Avg Calories"
                  value={Math.round(avgCalories)}
                  suffix="kcal/day"
                />
              </Col>
              <Col span={8}>
                <Statistic title="Total Water" value={totalWater} suffix="ml" />
              </Col>
            </Row>

            <div style={{ marginTop: 24 }}>
              <Title level={4}>Recent Activity</Title>
              <List
                dataSource={healthMetrics.slice(0, 5)}
                renderItem={(metric) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${metric.date}`}
                      description={
                        <Space>
                          {metric.steps && (
                            <Tag color="blue">{metric.steps} steps</Tag>
                          )}
                          {metric.calories && (
                            <Tag color="red">{metric.calories} kcal</Tag>
                          )}
                          {metric.water_ml && (
                            <Tag color="cyan">{metric.water_ml}ml water</Tag>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Recent Notifications" style={{ height: 400 }}>
            <List
              dataSource={notifications}
              renderItem={(notification) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<BellOutlined />} size="small" />}
                    title={notification.message}
                    description={
                      notification.sent_at
                        ? new Date(notification.sent_at).toLocaleDateString()
                        : "Just now"
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: "No notifications" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );

  const renderContent = () => {
    switch (selectedKey) {
      case "dashboard":
        return renderDashboardContent();
      case "profile":
        return <ProfilePage />;
      case "health":
        return <HealthMetricsPage />;
      case "reports":
        return <ReportsPage />;
      case "notifications":
        return <NotificationsPage />;
      case "admin":
        return <RoleManagementPage />;
      case "database":
        return <DatabaseManagementPage />;
      default:
        return renderDashboardContent();
    }
  };

  if (loading || adminLoading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text>Loading dashboard...</Text>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          background: "#fff",
          boxShadow: "2px 0 8px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Title level={4} style={{ margin: 0, color: "#1890ff" }}>
            {collapsed ? "H" : "HealthApp"}
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{ borderRight: 0, marginTop: 16 }}
          onClick={({ key }) => setSelectedKey(key)}
        >
          {menuItems.map((item) => (
            <Menu.Item key={item.key} icon={item.icon}>
              <span>{item.label}</span>
            </Menu.Item>
          ))}
        </Menu>
      </Sider>

      <Layout>
        {/* Header */}
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <UserOutlined /> : <UserOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16 }}
          />

          <Space>
            <NotificationsPopup>
              <Button type="text" icon={<BellOutlined />} />
            </NotificationsPopup>
            <Dropdown overlay={userMenu} placement="bottomRight">
              <Space style={{ cursor: "pointer" }}>
                <Avatar icon={<UserOutlined />} />
                <Text strong>{userProfile?.username}</Text>
                {userProfile?.is_premium && <Tag color="gold">Premium</Tag>}
                {isAdmin && <Tag color="red">Admin</Tag>}
                {isDataAnalyst && <Tag color="blue">Data Analyst</Tag>}
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* Main Content */}
        <Content
          style={{
            margin: selectedKey === "dashboard" ? "24px" : "0",
            padding: selectedKey === "dashboard" ? "24px" : "0",
            background: selectedKey === "dashboard" ? "#fff" : "transparent",
            borderRadius: selectedKey === "dashboard" ? "8px" : "0",
            minHeight: "calc(100vh - 112px)",
          }}
        >
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardScreen;
