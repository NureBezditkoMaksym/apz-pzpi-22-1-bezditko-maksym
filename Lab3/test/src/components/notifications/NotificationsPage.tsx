import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  List,
  Button,
  Typography,
  Empty,
  Space,
  Tag,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Statistic,
  Modal,
  Form,
  message,
  Popconfirm,
  Tooltip,
  Badge,
} from "antd";
import {
  DeleteOutlined,
  ReloadOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  BellOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import type { Tables } from "../../types/supabase";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface NotificationStats {
  total: number;
  today: number;
  thisWeek: number;
  unread: number;
}

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Tables<"notifications">[]>(
    []
  );
  const [filteredNotifications, setFilteredNotifications] = useState<
    Tables<"notifications">[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    today: 0,
    thisWeek: 0,
    unread: 0,
  });
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null
  );
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [form] = Form.useForm();
  const subscriptionRef = useRef<any>(null);

  // Handle date range change
  const handleDateRangeChange = (
    dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  ) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    } else {
      setDateRange(null);
    }
  };

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        setNotifications([]);
        return;
      }

      if (profile) {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", profile.id)
          .order("sent_at", { ascending: false });

        if (error) {
          console.error("Error fetching notifications:", error);
          setNotifications([]);
        } else {
          setNotifications(data || []);
        }
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Calculate statistics
  const calculateStats = useCallback(
    (notificationList: Tables<"notifications">[]) => {
      const now = dayjs();
      const today = now.startOf("day");
      const weekStart = now.startOf("week");

      const stats: NotificationStats = {
        total: notificationList.length,
        today: 0,
        thisWeek: 0,
        unread: notificationList.length, // Since we don't have read status, all are considered unread
      };

      notificationList.forEach((notification) => {
        if (notification.sent_at) {
          const sentDate = dayjs(notification.sent_at);
          if (sentDate.isAfter(today)) {
            stats.today++;
          }
          if (sentDate.isAfter(weekStart)) {
            stats.thisWeek++;
          }
        }
      });

      setStats(stats);
    },
    []
  );

  // Filter notifications
  const filterNotifications = useCallback(() => {
    let filtered = [...notifications];

    // Search filter
    if (searchText) {
      filtered = filtered.filter((notification) =>
        notification.message.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== "all") {
      filtered = filtered.filter((notification) => {
        const type = getNotificationType(notification.message).type;
        return type === filterType;
      });
    }

    // Date range filter
    if (dateRange) {
      const [start, end] = dateRange;
      filtered = filtered.filter((notification) => {
        if (!notification.sent_at) return false;
        const sentDate = dayjs(notification.sent_at);
        return (
          sentDate.isAfter(start.startOf("day")) &&
          sentDate.isBefore(end.endOf("day"))
        );
      });
    }

    setFilteredNotifications(filtered);
  }, [notifications, searchText, filterType, dateRange]);

  // Get notification type and color
  const getNotificationType = (message: string) => {
    if (
      message.toLowerCase().includes("goal") ||
      message.toLowerCase().includes("achievement") ||
      message.toLowerCase().includes("congratulations")
    ) {
      return { type: "success", color: "green", icon: <CheckCircleOutlined /> };
    }
    if (
      message.toLowerCase().includes("reminder") ||
      message.toLowerCase().includes("time") ||
      message.toLowerCase().includes("don't forget")
    ) {
      return { type: "warning", color: "orange", icon: <WarningOutlined /> };
    }
    if (
      message.toLowerCase().includes("alert") ||
      message.toLowerCase().includes("important") ||
      message.toLowerCase().includes("expires")
    ) {
      return {
        type: "error",
        color: "red",
        icon: <ExclamationCircleOutlined />,
      };
    }
    return { type: "info", color: "blue", icon: <InfoCircleOutlined /> };
  };

  // Format notification time
  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "Just now";
    return dayjs(timestamp).format("MMM DD, YYYY HH:mm");
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    setDeletingIds((prev) => new Set(prev).add(notificationId));

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("notification_id", notificationId);

      if (error) {
        console.error("Error deleting notification:", error);
        message.error("Failed to delete notification");
      } else {
        setNotifications((prev) =>
          prev.filter((n) => n.notification_id !== notificationId)
        );
        message.success("Notification deleted successfully");
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
      message.error("Failed to delete notification");
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (profile) {
        const { error } = await supabase
          .from("notifications")
          .delete()
          .eq("user_id", profile.id);

        if (error) {
          console.error("Error clearing notifications:", error);
          message.error("Failed to clear notifications");
        } else {
          setNotifications([]);
          message.success("All notifications cleared successfully");
        }
      }
    } catch (err) {
      console.error("Error clearing notifications:", err);
      message.error("Failed to clear notifications");
    } finally {
      setLoading(false);
    }
  };

  // Create notification
  const createNotification = async (values: {
    message: string;
    type: string;
  }) => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (profile) {
        const { error } = await supabase.from("notifications").insert({
          user_id: profile.id,
          message: values.message,
          sent_at: new Date().toISOString(),
        });

        if (error) {
          console.error("Error creating notification:", error);
          message.error("Failed to create notification");
        } else {
          message.success("Notification created successfully");
          setCreateModalVisible(false);
          form.resetFields();
          fetchNotifications();
        }
      }
    } catch (err) {
      console.error("Error creating notification:", err);
      message.error("Failed to create notification");
    }
  };

  // Create test notification
  const createTestNotification = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (profile) {
        const testMessages = [
          "🎉 Congratulations! You've reached your daily step goal of 10,000 steps!",
          "💧 Reminder: Don't forget to stay hydrated - you're 2 glasses behind today",
          "🔥 Great job! You've burned 500 calories today and exceeded your goal!",
          "⚠️ Important: Your premium subscription expires in 3 days",
          "📊 Your weekly health report is ready to view - check out your progress!",
          "🏃‍♂️ Achievement unlocked: 7-day streak of meeting your fitness goals!",
          "🥗 Nutrition tip: Consider adding more vegetables to reach your daily fiber goal",
          "😴 Sleep reminder: Aim for 8 hours of sleep tonight for optimal recovery",
        ];

        const randomMessage =
          testMessages[Math.floor(Math.random() * testMessages.length)];

        await supabase.from("notifications").insert({
          user_id: profile.id,
          message: randomMessage,
          sent_at: new Date().toISOString(),
        });

        message.success("Test notification created!");
      }
    } catch (err) {
      console.error("Error creating test notification:", err);
      message.error("Failed to create test notification");
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let subscription: any = null;

    const setupSubscription = async () => {
      try {
        if (!isMounted || subscriptionRef.current) return;

        const { data: profile } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user.id)
          .single();

        if (profile && isMounted && !subscriptionRef.current) {
          const channelName = `notifications_page_${profile.id}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;

          subscription = supabase
            .channel(channelName)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "notifications",
                filter: `user_id=eq.${profile.id}`,
              },
              (payload) => {
                if (isMounted) {
                  const newNotification =
                    payload.new as Tables<"notifications">;
                  setNotifications((prev) => [newNotification, ...prev]);
                }
              }
            )
            .on(
              "postgres_changes",
              {
                event: "DELETE",
                schema: "public",
                table: "notifications",
                filter: `user_id=eq.${profile.id}`,
              },
              (payload) => {
                if (isMounted) {
                  const deletedNotification =
                    payload.old as Tables<"notifications">;
                  setNotifications((prev) =>
                    prev.filter(
                      (n) =>
                        n.notification_id !==
                        deletedNotification.notification_id
                    )
                  );
                }
              }
            )
            .subscribe();

          if (isMounted) {
            subscriptionRef.current = subscription;
          } else {
            subscription.unsubscribe();
          }
        }
      } catch (error) {
        console.error("Error setting up notification subscription:", error);
      }
    };

    setupSubscription();

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (subscription && subscription !== subscriptionRef.current) {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  // Effects
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  useEffect(() => {
    calculateStats(notifications);
    filterNotifications();
  }, [notifications, calculateStats, filterNotifications]);

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Title level={2}>
          <BellOutlined style={{ marginRight: "8px" }} />
          Notifications
        </Title>
        <Text type="secondary">
          Manage and view all your notifications in one place
        </Text>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: "24px" }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Notifications"
              value={stats.total}
              prefix={<BellOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Today"
              value={stats.today}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="This Week"
              value={stats.thisWeek}
              prefix={<WarningOutlined />}
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Unread"
              value={stats.unread}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters and Actions */}
      <Card style={{ marginBottom: "24px" }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="Search notifications..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Select
              placeholder="Filter by type"
              value={filterType}
              onChange={setFilterType}
              style={{ width: "100%" }}
              suffixIcon={<FilterOutlined />}
            >
              <Select.Option value="all">All Types</Select.Option>
              <Select.Option value="success">Success</Select.Option>
              <Select.Option value="warning">Warning</Select.Option>
              <Select.Option value="error">Error</Select.Option>
              <Select.Option value="info">Info</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              style={{ width: "100%" }}
              placeholder={["Start Date", "End Date"]}
            />
          </Col>
          <Col xs={24} sm={24} md={6}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchNotifications}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
              >
                Create
              </Button>
              {process.env.NODE_ENV === "development" && (
                <Tooltip title="Add test notification (dev only)">
                  <Button
                    icon={<PlusOutlined />}
                    onClick={createTestNotification}
                  >
                    Test
                  </Button>
                </Tooltip>
              )}
              {notifications.length > 0 && (
                <Popconfirm
                  title="Are you sure you want to clear all notifications?"
                  onConfirm={clearAllNotifications}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button danger icon={<DeleteOutlined />}>
                    Clear All
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Notifications List */}
      <Card>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Text>Loading notifications...</Text>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Empty
            description={
              notifications.length === 0
                ? "No notifications yet"
                : "No notifications match your filters"
            }
            style={{ padding: "40px" }}
          />
        ) : (
          <List
            dataSource={filteredNotifications}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} notifications`,
            }}
            renderItem={(notification) => {
              const { color, icon, type } = getNotificationType(
                notification.message
              );
              return (
                <List.Item
                  actions={[
                    <Popconfirm
                      title="Are you sure you want to delete this notification?"
                      onConfirm={() =>
                        deleteNotification(notification.notification_id)
                      }
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        loading={deletingIds.has(notification.notification_id)}
                      >
                        Delete
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge dot>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            backgroundColor: color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "16px",
                          }}
                        >
                          {icon}
                        </div>
                      </Badge>
                    }
                    title={
                      <Space>
                        <Tag color={color}>{type.toUpperCase()}</Tag>
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          {formatTime(notification.sent_at)}
                        </Text>
                      </Space>
                    }
                    description={
                      <Text style={{ fontSize: "14px", lineHeight: 1.5 }}>
                        {notification.message}
                      </Text>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>

      {/* Create Notification Modal */}
      <Modal
        title="Create New Notification"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={createNotification}>
          <Form.Item
            name="message"
            label="Message"
            rules={[
              { required: true, message: "Please enter a message" },
              { min: 10, message: "Message must be at least 10 characters" },
              { max: 500, message: "Message must not exceed 500 characters" },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Enter notification message..."
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true, message: "Please select a type" }]}
          >
            <Select placeholder="Select notification type">
              <Select.Option value="info">Info</Select.Option>
              <Select.Option value="success">Success</Select.Option>
              <Select.Option value="warning">Warning</Select.Option>
              <Select.Option value="error">Error</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setCreateModalVisible(false);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Create Notification
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NotificationsPage;
