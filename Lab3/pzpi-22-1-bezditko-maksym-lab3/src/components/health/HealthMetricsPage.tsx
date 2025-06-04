import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Form,
  Input,
  DatePicker,
  Table,
  Space,
  Typography,
  Progress,
  Modal,
  Alert,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  StepForwardOutlined,
  FireOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "../../types/supabase";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const HealthMetricsPage: React.FC = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [userProfile, setUserProfile] = useState<Tables<"users"> | null>(null);
  const [metrics, setMetrics] = useState<Tables<"health_metrics">[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMetric, setEditingMetric] =
    useState<Tables<"health_metrics"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null
  );
  const [stats, setStats] = useState({
    totalSteps: 0,
    avgCalories: 0,
    totalWater: 0,
    totalDays: 0,
    weeklyGoalProgress: 0,
  });

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

  // Fetch user profile and metrics
  useEffect(() => {
    const fetchData = async () => {
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

          // Fetch health metrics
          let query = supabase
            .from("health_metrics")
            .select("*")
            .eq("user_id", profile.id)
            .order("date", { ascending: false });

          // Apply date filter if set
          if (dateRange) {
            query = query
              .gte("date", dateRange[0].format("YYYY-MM-DD"))
              .lte("date", dateRange[1].format("YYYY-MM-DD"));
          }

          const { data: metricsData, error } = await query;

          if (error) {
            setError(error.message);
          } else {
            setMetrics(metricsData || []);
            calculateStats(metricsData || []);
          }
        }
      } catch (err) {
        setError("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, dateRange]);

  // Calculate statistics
  const calculateStats = (metricsData: Tables<"health_metrics">[]) => {
    const totalSteps = metricsData.reduce((sum, m) => sum + (m.steps || 0), 0);
    const totalCalories = metricsData.reduce(
      (sum, m) => sum + (m.calories || 0),
      0
    );
    const totalWater = metricsData.reduce(
      (sum, m) => sum + (m.water_ml || 0),
      0
    );
    const totalDays = metricsData.length;
    const avgCalories = totalDays > 0 ? totalCalories / totalDays : 0;

    // Weekly goal progress (assuming 70,000 steps per week)
    const weeklyGoalProgress = Math.min((totalSteps / 70000) * 100, 100);

    setStats({
      totalSteps,
      avgCalories: Math.round(avgCalories),
      totalWater,
      totalDays,
      weeklyGoalProgress,
    });
  };

  // Handle form submission
  const handleSubmit = async (values: any) => {
    if (!userProfile) return;

    setSaving(true);
    setError(null);

    try {
      const metricData: TablesInsert<"health_metrics"> = {
        date: values.date.format("YYYY-MM-DD"),
        user_id: userProfile.id,
        steps: values.steps || null,
        calories: values.calories || null,
        water_ml: values.water_ml || null,
      };

      if (editingMetric) {
        // Update existing metric
        const { error } = await supabase
          .from("health_metrics")
          .update(metricData as TablesUpdate<"health_metrics">)
          .eq("metric_id", editingMetric.metric_id);

        if (error) {
          setError(error.message);
        } else {
          // Refresh data
          const { data: updatedMetrics } = await supabase
            .from("health_metrics")
            .select("*")
            .eq("user_id", userProfile.id)
            .order("date", { ascending: false });

          setMetrics(updatedMetrics || []);
          calculateStats(updatedMetrics || []);
          setModalVisible(false);
          setEditingMetric(null);
          form.resetFields();
        }
      } else {
        // Create new metric
        const { error } = await supabase
          .from("health_metrics")
          .insert(metricData);

        if (error) {
          setError(error.message);
        } else {
          // Refresh data
          const { data: updatedMetrics } = await supabase
            .from("health_metrics")
            .select("*")
            .eq("user_id", userProfile.id)
            .order("date", { ascending: false });

          setMetrics(updatedMetrics || []);
          calculateStats(updatedMetrics || []);
          setModalVisible(false);
          form.resetFields();
        }
      }
    } catch (err) {
      setError("Failed to save metric");
    } finally {
      setSaving(false);
    }
  };

  // Handle edit
  const handleEdit = (metric: Tables<"health_metrics">) => {
    setEditingMetric(metric);
    form.setFieldsValue({
      date: dayjs(metric.date),
      steps: metric.steps,
      calories: metric.calories,
      water_ml: metric.water_ml,
    });
    setModalVisible(true);
  };

  // Handle delete
  const handleDelete = async (metricId: string) => {
    Modal.confirm({
      title: "Delete Health Metric",
      content: "Are you sure you want to delete this health metric?",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        const { error } = await supabase
          .from("health_metrics")
          .delete()
          .eq("metric_id", metricId);

        if (error) {
          setError(error.message);
        } else {
          setMetrics((prev) => prev.filter((m) => m.metric_id !== metricId));
          calculateStats(metrics.filter((m) => m.metric_id !== metricId));
        }
      },
    });
  };

  // Handle modal close
  const handleModalClose = () => {
    setModalVisible(false);
    setEditingMetric(null);
    setError(null);
    form.resetFields();
  };

  // Table columns
  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date: string) => dayjs(date).format("MMM DD, YYYY"),
      sorter: (a: Tables<"health_metrics">, b: Tables<"health_metrics">) =>
        dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: "Steps",
      dataIndex: "steps",
      key: "steps",
      render: (steps: number | null) =>
        steps ? (
          <Space>
            <StepForwardOutlined style={{ color: "#1890ff" }} />
            {steps.toLocaleString()}
          </Space>
        ) : (
          <Text type="secondary">-</Text>
        ),
      sorter: (a: Tables<"health_metrics">, b: Tables<"health_metrics">) =>
        (a.steps || 0) - (b.steps || 0),
    },
    {
      title: "Calories",
      dataIndex: "calories",
      key: "calories",
      render: (calories: number | null) =>
        calories ? (
          <Space>
            <FireOutlined style={{ color: "#ff7875" }} />
            {calories}
          </Space>
        ) : (
          <Text type="secondary">-</Text>
        ),
      sorter: (a: Tables<"health_metrics">, b: Tables<"health_metrics">) =>
        (a.calories || 0) - (b.calories || 0),
    },
    {
      title: "Water (ml)",
      dataIndex: "water_ml",
      key: "water_ml",
      render: (water: number | null) =>
        water ? (
          <Space>
            <ThunderboltOutlined style={{ color: "#40a9ff" }} />
            {water}
          </Space>
        ) : (
          <Text type="secondary">-</Text>
        ),
      sorter: (a: Tables<"health_metrics">, b: Tables<"health_metrics">) =>
        (a.water_ml || 0) - (b.water_ml || 0),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Tables<"health_metrics">) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.metric_id)}
          />
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Text>Loading health metrics...</Text>
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
        <Title level={2}>Health Metrics</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalVisible(true)}
        >
          Add Metric
        </Button>
      </div>

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

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Steps"
              value={stats.totalSteps}
              prefix={<StepForwardOutlined style={{ color: "#1890ff" }} />}
              suffix="steps"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Avg Calories"
              value={stats.avgCalories}
              prefix={<FireOutlined style={{ color: "#ff7875" }} />}
              suffix="kcal/day"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Water"
              value={stats.totalWater}
              prefix={<ThunderboltOutlined style={{ color: "#40a9ff" }} />}
              suffix="ml"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Weekly Goal"
              value={Math.round(stats.weeklyGoalProgress)}
              prefix={<TrophyOutlined style={{ color: "#faad14" }} />}
              suffix="%"
            />
            <Progress
              percent={stats.weeklyGoalProgress}
              showInfo={false}
              strokeColor="#faad14"
              size="small"
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          <Text strong>Filter by date:</Text>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            format="YYYY-MM-DD"
          />
          <Button onClick={() => setDateRange(null)}>Clear Filter</Button>
        </Space>
      </Card>

      {/* Metrics Table */}
      <Card title={`Health Metrics (${metrics.length} records)`}>
        <Table
          dataSource={metrics}
          columns={columns}
          rowKey="metric_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} items`,
          }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingMetric ? "Edit Health Metric" : "Add Health Metric"}
        open={modalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            date: dayjs(),
          }}
        >
          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: "Please select a date" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="steps"
                label="Steps"
                rules={[
                  { 
                    type: "number",
                    transform: (value) => Number(value)
                  },
                  {
                    validator: (_, value) => {
                      if (value && isNaN(Number(value))) {
                        return Promise.reject('Please enter a valid number');
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input
                  type="number"
                  placeholder="e.g., 10000"
                  prefix={<StepForwardOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="calories"
                label="Calories"
                rules={[
                  {
                    type: "number",
                    transform: (value) => Number(value)
                  },
                  {
                    validator: (_, value) => {
                      if (value && isNaN(Number(value))) {
                        return Promise.reject('Please enter a valid number');
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input
                  type="number"
                  placeholder="e.g., 2000"
                  prefix={<FireOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="water_ml"
                label="Water (ml)"
                rules={[
                  {
                    type: "number",
                    transform: (value) => Number(value)
                  },
                  {
                    validator: (_, value) => {
                      if (value && isNaN(Number(value))) {
                        return Promise.reject('Please enter a valid number');
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input
                  type="number"
                  placeholder="e.g., 2000"
                  prefix={<ThunderboltOutlined />}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={handleModalClose}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={saving}>
                {editingMetric ? "Update" : "Add"} Metric
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HealthMetricsPage;
