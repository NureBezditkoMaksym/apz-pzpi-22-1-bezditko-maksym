import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Typography,
  Tag,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Alert,
  Progress,
  Tabs,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  CrownOutlined,
  TeamOutlined,
  SettingOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { useAdmin } from "../../hooks/useAdmin";
import type { Tables } from "../../types/supabase";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface UserWithRoles extends Tables<"users"> {
  roles: Tables<"user_roles">[];
}

// Chart colors
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

const RoleManagementPage: React.FC = () => {
  const {
    isAdmin,
    loading: adminLoading,
    getAllUsers,
    getAllRoles,
    getUserRoleAssignments,
    assignRole,
    removeRole,
    createRole,
    deleteRole,
    deleteUser,
    deleteUserHealthMetrics,
  } = useAdmin();

  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [roles, setRoles] = useState<Tables<"user_roles">[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Tables<"users"> | null>(
    null
  );
  const [form] = Form.useForm();
  const [roleForm] = Form.useForm();

  // Chart data processing functions
  const getUserRegistrationTrends = () => {
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = dayjs().subtract(11 - i, "month");
      return {
        month: date.format("MMM YYYY"),
        users: users.filter(
          (user) =>
            dayjs(user.created_at).format("MMM YYYY") ===
            date.format("MMM YYYY")
        ).length,
        premium: users.filter(
          (user) =>
            dayjs(user.created_at).format("MMM YYYY") ===
              date.format("MMM YYYY") && user.is_premium
        ).length,
      };
    });
    return last12Months;
  };

  const getRoleDistribution = () => {
    return roles.map((role) => ({
      name: role.role_name,
      value: users.filter((user) =>
        user.roles.some((userRole) => userRole.role_id === role.role_id)
      ).length,
      color: COLORS[roles.indexOf(role) % COLORS.length],
    }));
  };

  const getUserTypeDistribution = () => {
    const premiumUsers = users.filter((user) => user.is_premium).length;
    const regularUsers = users.length - premiumUsers;
    return [
      { name: "Premium Users", value: premiumUsers, color: "#FFD700" },
      { name: "Regular Users", value: regularUsers, color: "#87CEEB" },
    ];
  };

  const getWeeklyUserActivity = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = dayjs().subtract(6 - i, "day");
      return {
        day: date.format("ddd"),
        date: date.format("MMM DD"),
        newUsers: users.filter(
          (user) =>
            dayjs(user.created_at).format("YYYY-MM-DD") ===
            date.format("YYYY-MM-DD")
        ).length,
      };
    });
    return last7Days;
  };

  const getRoleGrowthData = () => {
    return roles.map((role) => {
      const userCount = users.filter((user) =>
        user.roles.some((userRole) => userRole.role_id === role.role_id)
      ).length;
      const percentage =
        users.length > 0 ? (userCount / users.length) * 100 : 0;

      return {
        name: role.role_name,
        users: userCount,
        percentage: Math.round(percentage),
        fill: COLORS[roles.indexOf(role) % COLORS.length],
      };
    });
  };

  // Fetch data function
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users and roles
      const [usersResult, rolesResult] = await Promise.all([
        getAllUsers(),
        getAllRoles(),
      ]);

      if (usersResult.error) {
        message.error("Failed to fetch users");
        return;
      }

      if (rolesResult.error) {
        message.error("Failed to fetch roles");
        return;
      }

      const usersData = usersResult.data || [];
      const rolesData = rolesResult.data || [];

      // Fetch role assignments for each user
      const usersWithRoles = await Promise.all(
        usersData.map(async (user) => {
          const { data: assignments } = await getUserRoleAssignments(user.id);
          const userRoles = rolesData.filter((role) =>
            assignments?.some(
              (assignment) => assignment.role_id === role.role_id
            )
          );
          return { ...user, roles: userRoles };
        })
      );

      setUsers(usersWithRoles);
      setRoles(rolesData);
    } catch (error) {
      message.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and when admin status changes
  useEffect(() => {
    if (isAdmin && !adminLoading) {
      fetchData();
    }
  }, [isAdmin, adminLoading]);

  // Handle role assignment
  const handleAssignRole = async (values: { roleId: string }) => {
    if (!selectedUser) return;

    try {
      const { error } = await assignRole(selectedUser.id, values.roleId);
      if (error) {
        message.error("Failed to assign role");
      } else {
        message.success("Role assigned successfully");
        setModalVisible(false);
        form.resetFields();
        fetchData();
      }
    } catch (error) {
      message.error("Failed to assign role");
    }
  };

  // Handle role removal
  const handleRemoveRole = async (userId: string, roleId: string) => {
    try {
      const { error } = await removeRole(userId, roleId);
      if (error) {
        message.error("Failed to remove role");
      } else {
        message.success("Role removed successfully");
        fetchData();
      }
    } catch (error) {
      message.error("Failed to remove role");
    }
  };

  // Handle create role
  const handleCreateRole = async (values: { roleName: string }) => {
    try {
      const { error } = await createRole(values.roleName);
      if (error) {
        message.error("Failed to create role");
      } else {
        message.success("Role created successfully");
        setRoleModalVisible(false);
        roleForm.resetFields();
        fetchData();
      }
    } catch (error) {
      message.error("Failed to create role");
    }
  };

  // Handle delete role
  const handleDeleteRole = async (roleId: string) => {
    try {
      const { error } = await deleteRole(roleId);
      if (error) {
        message.error("Failed to delete role");
      } else {
        message.success("Role deleted successfully");
        fetchData();
      }
    } catch (error) {
      message.error("Failed to delete role");
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await deleteUser(userId);
      if (error) {
        message.error("Failed to delete user");
      } else {
        message.success("User deleted successfully");
        fetchData();
      }
    } catch (error) {
      message.error("Failed to delete user");
    }
  };

  // Handle delete user health metrics
  const handleDeleteUserHealthMetrics = async (userId: string) => {
    try {
      const { error } = await deleteUserHealthMetrics(userId);
      if (error) {
        message.error("Failed to delete user health metrics");
      } else {
        message.success("User health metrics deleted successfully");
      }
    } catch (error) {
      message.error("Failed to delete user health metrics");
    }
  };

  // Get available roles for user
  const getAvailableRoles = (user: UserWithRoles) => {
    const userRoleIds = user.roles.map((role) => role.role_id);
    return roles.filter((role) => !userRoleIds.includes(role.role_id));
  };

  // User table columns
  const userColumns = [
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
      render: (username: string, record: UserWithRoles) => (
        <Space>
          <UserOutlined />
          <span>{username}</span>
          {record.is_premium && <Tag color="gold">Premium</Tag>}
        </Space>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Roles",
      key: "roles",
      render: (_: any, record: UserWithRoles) => (
        <Space wrap>
          {record.roles.map((role) => (
            <Tag
              key={role.role_id}
              color={role.role_name.toLowerCase() === "admin" ? "red" : "blue"}
              closable
              onClose={() => handleRemoveRole(record.id, role.role_id)}
            >
              {role.role_name}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => dayjs(date).format("MMM DD, YYYY"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: UserWithRoles) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              setSelectedUser(record);
              setModalVisible(true);
            }}
            disabled={getAvailableRoles(record).length === 0}
          >
            Assign Role
          </Button>
          <Popconfirm
            title="Delete Health Metrics"
            description="Are you sure you want to delete all health metrics for this user?"
            onConfirm={() => handleDeleteUserHealthMetrics(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" danger>
              Delete Metrics
            </Button>
          </Popconfirm>
          <Popconfirm
            title="Delete User"
            description="Are you sure you want to delete this user and all their data?"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete User
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Role table columns
  const roleColumns = [
    {
      title: "Role Name",
      dataIndex: "role_name",
      key: "role_name",
      render: (roleName: string) => (
        <Space>
          <CrownOutlined />
          <span>{roleName}</span>
        </Space>
      ),
    },
    {
      title: "Users Count",
      key: "users_count",
      render: (_: any, record: Tables<"user_roles">) => {
        const count = users.filter((user) =>
          user.roles.some((role) => role.role_id === record.role_id)
        ).length;
        return <Tag color="blue">{count} users</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Tables<"user_roles">) => (
        <Popconfirm
          title="Delete Role"
          description="Are you sure you want to delete this role? This will remove it from all users."
          onConfirm={() => handleDeleteRole(record.role_id)}
          okText="Yes"
          cancelText="No"
        >
          <Button size="small" danger icon={<DeleteOutlined />}>
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];

  if (adminLoading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Text>Loading admin panel...</Text>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Alert
          message="Access Denied"
          description="You don't have permission to access this page."
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Title level={2}>Role Management Dashboard</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setRoleModalVisible(true)}
        >
          Create Role
        </Button>
      </div>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={users.length}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Roles"
              value={roles.length}
              prefix={<CrownOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Admin Users"
              value={
                users.filter((user) =>
                  user.roles.some((role) =>
                    role.role_name.toLowerCase().includes("admin")
                  )
                ).length
              }
              prefix={<SettingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Premium Users"
              value={users.filter((user) => user.is_premium).length}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Analytics Dashboard */}
      <Tabs defaultActiveKey="1" style={{ marginBottom: 24 }}>
        <TabPane
          tab={
            <span>
              <BarChartOutlined />
              Overview
            </span>
          }
          key="1"
        >
          <Row gutter={[16, 16]}>
            {/* User Registration Trends */}
            <Col xs={24} lg={12}>
              <Card
                title="User Registration Trends (Last 12 Months)"
                extra={<LineChartOutlined />}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={getUserRegistrationTrends()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      name="Total Users"
                    />
                    <Area
                      type="monotone"
                      dataKey="premium"
                      stackId="1"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      name="Premium Users"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            {/* Role Distribution */}
            <Col xs={24} lg={12}>
              <Card title="Role Distribution" extra={<PieChartOutlined />}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getRoleDistribution()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getRoleDistribution().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            {/* Weekly User Activity */}
            <Col xs={24} lg={12}>
              <Card title="New Users This Week" extra={<BarChartOutlined />}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getWeeklyUserActivity()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="newUsers" fill="#8884d8" name="New Users" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            {/* User Type Distribution */}
            <Col xs={24} lg={12}>
              <Card title="Premium vs Regular Users">
                <Row gutter={16}>
                  <Col span={12}>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={getUserTypeDistribution()}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {getUserTypeDistribution().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Col>
                  <Col span={12}>
                    <div style={{ padding: "20px 0" }}>
                      {getUserTypeDistribution().map((item, index) => (
                        <div key={index} style={{ marginBottom: 16 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <div
                              style={{
                                width: 12,
                                height: 12,
                                backgroundColor: item.color,
                                marginRight: 8,
                                borderRadius: 2,
                              }}
                            />
                            <Text strong>{item.name}</Text>
                          </div>
                          <Progress
                            percent={
                              users.length > 0
                                ? (item.value / users.length) * 100
                                : 0
                            }
                            strokeColor={item.color}
                            showInfo={false}
                          />
                          <Text type="secondary">{item.value} users</Text>
                        </div>
                      ))}
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane
          tab={
            <span>
              <PieChartOutlined />
              Role Analytics
            </span>
          }
          key="2"
        >
          <Row gutter={[16, 16]}>
            {/* Role Growth Radial Chart */}
            <Col xs={24} lg={12}>
              <Card title="Role Distribution (Radial View)">
                <ResponsiveContainer width="100%" height={400}>
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="10%"
                    outerRadius="80%"
                    data={getRoleGrowthData()}
                  >
                    <RadialBar
                      label={{ position: "insideStart", fill: "#fff" }}
                      background
                      dataKey="percentage"
                    />
                    <Legend
                      iconSize={10}
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                    />
                    <Tooltip />
                  </RadialBarChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            {/* Role Statistics */}
            <Col xs={24} lg={12}>
              <Card title="Role Statistics">
                <div style={{ padding: 16 }}>
                  {roles.map((role, index) => {
                    const userCount = users.filter((user) =>
                      user.roles.some(
                        (userRole) => userRole.role_id === role.role_id
                      )
                    ).length;
                    const percentage =
                      users.length > 0 ? (userCount / users.length) * 100 : 0;

                    return (
                      <div key={role.role_id} style={{ marginBottom: 24 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 8,
                          }}
                        >
                          <Text strong>{role.role_name}</Text>
                          <Text>
                            {userCount} users ({percentage.toFixed(1)}%)
                          </Text>
                        </div>
                        <Progress
                          percent={percentage}
                          strokeColor={COLORS[index % COLORS.length]}
                          showInfo={false}
                        />
                      </div>
                    );
                  })}
                </div>
              </Card>
            </Col>

            {/* Monthly Growth Comparison */}
            <Col xs={24}>
              <Card title="User Growth Comparison">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getUserRegistrationTrends()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke="#8884d8"
                      strokeWidth={3}
                      dot={{ r: 6 }}
                      name="Total Users"
                    />
                    <Line
                      type="monotone"
                      dataKey="premium"
                      stroke="#82ca9d"
                      strokeWidth={3}
                      dot={{ r: 6 }}
                      name="Premium Users"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>

      {/* Users Table */}
      <Card title="Users" style={{ marginBottom: 24 }}>
        <Table
          dataSource={users}
          columns={userColumns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} items`,
          }}
        />
      </Card>

      {/* Roles Table */}
      <Card title="Roles">
        <Table
          dataSource={roles}
          columns={roleColumns}
          rowKey="role_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} items`,
          }}
        />
      </Card>

      {/* Assign Role Modal */}
      <Modal
        title="Assign Role"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} onFinish={handleAssignRole} layout="vertical">
          <Form.Item
            name="roleId"
            label="Select Role"
            rules={[{ required: true, message: "Please select a role" }]}
          >
            <Select placeholder="Select a role">
              {selectedUser &&
                getAvailableRoles(
                  users.find((u) => u.id === selectedUser.id) as UserWithRoles
                ).map((role) => (
                  <Option key={role.role_id} value={role.role_id}>
                    {role.role_name}
                  </Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Assign Role
              </Button>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Role Modal */}
      <Modal
        title="Create New Role"
        open={roleModalVisible}
        onCancel={() => {
          setRoleModalVisible(false);
          roleForm.resetFields();
        }}
        footer={null}
      >
        <Form form={roleForm} onFinish={handleCreateRole} layout="vertical">
          <Form.Item
            name="roleName"
            label="Role Name"
            rules={[
              { required: true, message: "Please enter a role name" },
              { min: 2, message: "Role name must be at least 2 characters" },
            ]}
          >
            <Input placeholder="Enter role name (e.g., Admin, Moderator)" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Create Role
              </Button>
              <Button
                onClick={() => {
                  setRoleModalVisible(false);
                  roleForm.resetFields();
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoleManagementPage;
