import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Table,
  Space,
  Typography,
  DatePicker,
  Modal,
  Alert,
  Statistic,
  Empty,
} from "antd";
import {
  EyeOutlined,
  DeleteOutlined,
  PlusOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import type { Tables, TablesInsert } from "../../types/supabase";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface ReportData {
  period: string;
  totalSteps: number;
  avgSteps: number;
  totalCalories: number;
  avgCalories: number;
  totalWater: number;
  avgWater: number;
  daysTracked: number;
  goalAchievements: {
    stepsGoal: number;
    caloriesGoal: number;
    waterGoal: number;
  };
  trends: {
    stepsChange: number;
    caloriesChange: number;
    waterChange: number;
  };
}

const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<Tables<"users"> | null>(null);
  const [reports, setReports] = useState<Tables<"reports">[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] =
    useState<Tables<"reports"> | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null
  );

  // Fetch user profile and reports
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

          // Fetch reports
          const { data: reportsData, error } = await supabase
            .from("reports")
            .select("*")
            .eq("user_id", profile.id)
            .order("report_date", { ascending: false });

          if (error) {
            setError(error.message);
          } else {
            setReports(reportsData || []);
          }
        }
      } catch (err) {
        setError("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Generate report data
  const generateReportData = async (
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs
  ): Promise<ReportData | null> => {
    if (!userProfile) return null;

    try {
      // Fetch health metrics for the period
      const { data: metrics, error } = await supabase
        .from("health_metrics")
        .select("*")
        .eq("user_id", userProfile.id)
        .gte("date", startDate.format("YYYY-MM-DD"))
        .lte("date", endDate.format("YYYY-MM-DD"))
        .order("date", { ascending: true });

      if (error || !metrics) {
        throw new Error("Failed to fetch metrics");
      }

      // Calculate statistics
      const totalSteps = metrics.reduce((sum, m) => sum + (m.steps || 0), 0);
      const totalCalories = metrics.reduce(
        (sum, m) => sum + (m.calories || 0),
        0
      );
      const totalWater = metrics.reduce((sum, m) => sum + (m.water_ml || 0), 0);
      const daysTracked = metrics.length;

      const avgSteps =
        daysTracked > 0 ? Math.round(totalSteps / daysTracked) : 0;
      const avgCalories =
        daysTracked > 0 ? Math.round(totalCalories / daysTracked) : 0;
      const avgWater =
        daysTracked > 0 ? Math.round(totalWater / daysTracked) : 0;

      // Calculate goal achievements (assuming daily goals: 10k steps, 2k calories, 2L water)
      const stepsGoalDays = metrics.filter(
        (m) => (m.steps || 0) >= 10000
      ).length;
      const caloriesGoalDays = metrics.filter(
        (m) => (m.calories || 0) >= 2000
      ).length;
      const waterGoalDays = metrics.filter(
        (m) => (m.water_ml || 0) >= 2000
      ).length;

      // Calculate trends by comparing with the most recent previous report
      let trends = { stepsChange: 0, caloriesChange: 0, waterChange: 0 };

      if (reports.length > 0) {
        const previousReport = reports[0]; // Most recent report (already sorted newest first)
        const prevData = previousReport.report_data as unknown as ReportData;

        if (prevData) {
          trends = {
            stepsChange:
              prevData.avgSteps > 0
                ? Math.round(
                    ((avgSteps - prevData.avgSteps) / prevData.avgSteps) * 100
                  )
                : 0,
            caloriesChange:
              prevData.avgCalories > 0
                ? Math.round(
                    ((avgCalories - prevData.avgCalories) /
                      prevData.avgCalories) *
                      100
                  )
                : 0,
            waterChange:
              prevData.avgWater > 0
                ? Math.round(
                    ((avgWater - prevData.avgWater) / prevData.avgWater) * 100
                  )
                : 0,
          };
        }
      }

      return {
        period: `${startDate.format("MMM DD")} - ${endDate.format(
          "MMM DD, YYYY"
        )}`,
        totalSteps,
        avgSteps,
        totalCalories,
        avgCalories,
        totalWater,
        avgWater,
        daysTracked,
        goalAchievements: {
          stepsGoal: Math.round((stepsGoalDays / daysTracked) * 100),
          caloriesGoal: Math.round((caloriesGoalDays / daysTracked) * 100),
          waterGoal: Math.round((waterGoalDays / daysTracked) * 100),
        },
        trends,
      };
    } catch (err) {
      console.error("Error generating report data:", err);
      return null;
    }
  };

  // Generate new report
  const handleGenerateReport = async () => {
    if (!userProfile || !dateRange) return;

    setGenerating(true);
    setError(null);

    try {
      const reportData = await generateReportData(dateRange[0], dateRange[1]);

      if (!reportData) {
        setError("Failed to generate report data");
        return;
      }

      // Save report to database
      const reportInsert: TablesInsert<"reports"> = {
        user_id: userProfile.id,
        report_date: dayjs().format("YYYY-MM-DD"),
        report_data: reportData as any,
      };

      const { data: newReport, error } = await supabase
        .from("reports")
        .insert(reportInsert)
        .select()
        .single();

      if (error) {
        setError(error.message);
      } else {
        setReports((prev) => [newReport, ...prev]);
        setDateRange(null);
      }
    } catch (err) {
      setError("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  // View report details
  const handleViewReport = (report: Tables<"reports">) => {
    setSelectedReport(report);
    setModalVisible(true);
  };

  // Delete report
  const handleDeleteReport = async (reportId: string) => {
    Modal.confirm({
      title: "Delete Report",
      content: "Are you sure you want to delete this report?",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        const { error } = await supabase
          .from("reports")
          .delete()
          .eq("report_id", reportId);

        if (error) {
          setError(error.message);
        } else {
          setReports((prev) => prev.filter((r) => r.report_id !== reportId));
        }
      },
    });
  };

  // Get preset date ranges
  const getPresetDateRange = (
    period: "week" | "month" | "quarter"
  ): [dayjs.Dayjs, dayjs.Dayjs] => {
    const now = dayjs();
    switch (period) {
      case "week":
        return [now.subtract(7, "days"), now];
      case "month":
        return [now.subtract(1, "month"), now];
      case "quarter":
        return [now.subtract(3, "months"), now];
      default:
        return [now.subtract(1, "month"), now];
    }
  };

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

  // Table columns
  const columns = [
    {
      title: "Generated Date",
      dataIndex: "report_date",
      key: "report_date",
      render: (date: string) => dayjs(date).format("MMM DD, YYYY"),
      sorter: (a: Tables<"reports">, b: Tables<"reports">) =>
        dayjs(a.report_date).unix() - dayjs(b.report_date).unix(),
    },
    {
      title: "Period",
      key: "period",
      render: (_: any, record: Tables<"reports">) => {
        const data = record.report_data as unknown as ReportData;
        return data?.period || "Unknown";
      },
    },
    {
      title: "Days Tracked",
      key: "days_tracked",
      render: (_: any, record: Tables<"reports">) => {
        const data = record.report_data as unknown as ReportData;
        return data?.daysTracked || 0;
      },
    },
    {
      title: "Avg Steps",
      key: "avg_steps",
      render: (_: any, record: Tables<"reports">) => {
        const data = record.report_data as unknown as ReportData;
        return (data?.avgSteps || 0).toLocaleString();
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Tables<"reports">) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewReport(record)}
          >
            View
          </Button>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteReport(record.report_id)}
          />
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Text>Loading reports...</Text>
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
        <Title level={2}>Health Reports</Title>
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

      {/* Generate Report Section */}
      <Card title="Generate New Report" style={{ marginBottom: 24 }}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Text strong>Quick Generate:</Text>
          <Button onClick={() => setDateRange(getPresetDateRange("week"))}>
            Last Week
          </Button>
          <Button onClick={() => setDateRange(getPresetDateRange("month"))}>
            Last Month
          </Button>
          <Button onClick={() => setDateRange(getPresetDateRange("quarter"))}>
            Last Quarter
          </Button>
        </Space>

        <Space wrap>
          <Text strong>Custom Range:</Text>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            format="YYYY-MM-DD"
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleGenerateReport}
            loading={generating}
            disabled={!dateRange}
          >
            Generate Report
          </Button>
        </Space>
      </Card>

      {/* Reports Table */}
      <Card title={`Your Reports (${reports.length} total)`}>
        {reports.length === 0 ? (
          <Empty
            description="No reports generated yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              onClick={() => setDateRange(getPresetDateRange("month"))}
            >
              Generate Your First Report
            </Button>
          </Empty>
        ) : (
          <Table
            dataSource={reports}
            columns={columns}
            rowKey="report_id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} items`,
            }}
          />
        )}
      </Card>

      {/* Report Details Modal */}
      <Modal
        title="Report Details"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={800}
      >
        {selectedReport && (
          <div>
            {(() => {
              const data = selectedReport.report_data as unknown as ReportData;
              if (!data) return <Text>No report data available</Text>;

              return (
                <div>
                  <div style={{ marginBottom: 24, textAlign: "center" }}>
                    <Title level={4}>Health Report</Title>
                    <Text type="secondary">{data.period}</Text>
                    <br />
                    <Text type="secondary">
                      Generated on{" "}
                      {dayjs(selectedReport.report_date).format("MMM DD, YYYY")}
                    </Text>
                  </div>

                  {/* Summary Statistics */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col span={6}>
                      <Card>
                        <Statistic
                          title="Days Tracked"
                          value={data.daysTracked || 0}
                          prefix={<CalendarOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card>
                        <Statistic
                          title="Total Steps"
                          value={data.totalSteps || 0}
                          formatter={(value) => (value || 0).toLocaleString()}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card>
                        <Statistic
                          title="Avg Calories"
                          value={data.avgCalories || 0}
                          suffix="kcal/day"
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card>
                        <Statistic
                          title="Total Water"
                          value={data.totalWater || 0}
                          suffix="ml"
                          formatter={(value) => (value || 0).toLocaleString()}
                        />
                      </Card>
                    </Col>
                  </Row>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReportsPage;
