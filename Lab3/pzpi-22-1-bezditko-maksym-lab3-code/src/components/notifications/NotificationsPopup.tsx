import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Popover,
  List,
  Badge,
  Button,
  Typography,
  Empty,
  Space,
  Tag,
  Divider,
} from "antd";
import {
  DeleteOutlined,
  CloseOutlined,
  ReloadOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import type { Tables } from "../../types/supabase";

const { Text } = Typography;

interface NotificationsPopupProps {
  children: React.ReactNode;
  onNotificationCountChange?: (count: number) => void;
}

const NotificationsPopup: React.FC<NotificationsPopupProps> = ({
  children,
  onNotificationCountChange,
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Tables<"notifications">[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const subscriptionRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      // First get user profile to get user_id
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
          .order("sent_at", { ascending: false })
          .limit(50); // Increased limit for better UX

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
      } else {
        // Optimistically update the UI
        setNotifications((prev) =>
          prev.filter((n) => n.notification_id !== notificationId)
        );
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
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
        } else {
          // Optimistically update the UI
          setNotifications([]);
        }
      }
    } catch (err) {
      console.error("Error clearing notifications:", err);
    }
  };

  // Format notification time
  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "Just now";

    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Get notification type and color
  const getNotificationType = (message: string) => {
    if (
      message.toLowerCase().includes("goal") ||
      message.toLowerCase().includes("achievement")
    ) {
      return { type: "success", color: "green" };
    }
    if (
      message.toLowerCase().includes("reminder") ||
      message.toLowerCase().includes("time")
    ) {
      return { type: "warning", color: "orange" };
    }
    if (
      message.toLowerCase().includes("alert") ||
      message.toLowerCase().includes("important")
    ) {
      return { type: "error", color: "red" };
    }
    return { type: "info", color: "blue" };
  };

  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible, user, fetchNotifications]);

  // Fetch notifications on component mount and user change
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // Set up real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let subscription: any = null;

    const setupSubscription = async () => {
      try {
        // Check if component is still mounted and no subscription exists
        if (!isMounted || subscriptionRef.current) return;

        const { data: profile } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user.id)
          .single();

        if (profile && isMounted && !subscriptionRef.current) {
          // Create a unique channel name to avoid conflicts
          const channelName = `notifications_${profile.id}_${Math.random()
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

          // Only set the ref if component is still mounted
          if (isMounted) {
            subscriptionRef.current = subscription;
            isSubscribedRef.current = true;
          } else {
            // If component unmounted during setup, clean up immediately
            subscription.unsubscribe();
          }
        }
      } catch (error) {
        console.error("Error setting up notification subscription:", error);
      }
    };

    setupSubscription();

    // Cleanup function
    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
        isSubscribedRef.current = false;
      }
      if (subscription && subscription !== subscriptionRef.current) {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, []);

  // Refresh notifications manually
  const refreshNotifications = useCallback(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // Development helper: Create a test notification
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
          "🎉 Congratulations! You've reached your daily step goal!",
          "💧 Reminder: Don't forget to stay hydrated today",
          "🔥 Great job! You've burned 500 calories today",
          "⚠️ Important: Your subscription expires in 3 days",
          "📊 Your weekly health report is ready to view",
        ];

        const randomMessage =
          testMessages[Math.floor(Math.random() * testMessages.length)];

        await supabase.from("notifications").insert({
          user_id: profile.id,
          message: randomMessage,
          sent_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Error creating test notification:", err);
    }
  };

  // Update parent component when notification count changes
  useEffect(() => {
    if (onNotificationCountChange) {
      onNotificationCountChange(notifications.length);
    }
  }, [notifications.length, onNotificationCountChange]);

  const content = (
    <div style={{ width: 350, maxHeight: 400, overflow: "hidden" }}>
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text strong>Notifications ({notifications.length})</Text>
        <Space>
          <Button
            type="text"
            size="small"
            onClick={refreshNotifications}
            icon={<ReloadOutlined />}
            loading={loading}
            title="Refresh notifications"
          />
          {process.env.NODE_ENV === "development" && (
            <Button
              type="text"
              size="small"
              onClick={createTestNotification}
              icon={<PlusOutlined />}
              title="Add test notification (dev only)"
            />
          )}
          {notifications.length > 0 && (
            <Button
              type="text"
              size="small"
              onClick={clearAllNotifications}
              icon={<DeleteOutlined />}
              title="Clear all notifications"
            >
              Clear All
            </Button>
          )}
        </Space>
      </div>

      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: 16, textAlign: "center" }}>
            <Text type="secondary">Loading notifications...</Text>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: 16 }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No notifications"
              style={{ margin: 0 }}
            />
          </div>
        ) : (
          <List
            dataSource={notifications}
            renderItem={(notification) => {
              const { color } = getNotificationType(notification.message);
              return (
                <List.Item
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #f5f5f5",
                  }}
                  actions={[
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() =>
                        deleteNotification(notification.notification_id)
                      }
                      loading={deletingIds.has(notification.notification_id)}
                      style={{ color: "#999" }}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    description={
                      <Space
                        direction="vertical"
                        size={4}
                        style={{ width: "100%" }}
                      >
                        <Text style={{ fontSize: 13, lineHeight: 1.4 }}>
                          {notification.message}
                        </Text>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Tag
                            color={color}
                            style={{ margin: 0, fontSize: 10 }}
                          >
                            {getNotificationType(
                              notification.message
                            ).type.toUpperCase()}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {formatTime(notification.sent_at)}
                          </Text>
                        </div>
                      </Space>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </div>

      {notifications.length > 0 && (
        <>
          <Divider style={{ margin: 0 }} />
          <div style={{ padding: "8px 16px", textAlign: "center" }}>
            <Button type="link" size="small">
              View All Notifications
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      title={null}
      trigger="click"
      placement="bottomRight"
      open={visible}
      onOpenChange={setVisible}
      overlayStyle={{ padding: 0 }}
    >
      <Badge count={notifications.length} size="small">
        {children}
      </Badge>
    </Popover>
  );
};

export default NotificationsPopup;
