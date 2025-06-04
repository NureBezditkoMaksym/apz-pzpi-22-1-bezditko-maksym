import React, { useState } from "react";
import {
  Card,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Upload,
  message,
  Typography,
  Alert,
  Row,
  Col,
  Statistic,
  List,
  Tag,
} from "antd";
import {
  DownloadOutlined,
  UploadOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  LockOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { useAdmin } from "../../hooks/useAdmin";
import { supabase } from "../../lib/supabase";
import type { UploadFile } from "antd/es/upload/interface";
import { useAuth } from "../../hooks/useAuth";

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface ImportResult {
  [tableName: string]: {
    success: boolean;
    message: string;
    count?: number;
  };
}

const DatabaseManagementPage: React.FC = () => {
  const { isDataAnalyst, loading: adminLoading } = useAdmin();
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [exportForm] = Form.useForm();
  const [importForm] = Form.useForm();

  // Handle database export
  const handleExport = async (values: { password: string }) => {
    setExportLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        message.error("Authentication required");
        return;
      }

      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", session.user.id)
        .single();

      const { data, error } = await supabase.functions.invoke(
        "export-database",
        {
          body: { password: values.password, userId: user?.id || "" },
        }
      );

      if (error) {
        throw error;
      }

      // Get the filename from the response headers
      let filename = data.filename || "database-export.encrypted.json";

      // Create blob and download from base64 data
      const byteCharacters = atob(data.fileContent);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/json" });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success("Database exported successfully!");
      setExportModalVisible(false);
      exportForm.resetFields();
    } catch (error) {
      console.error("Export error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      message.error(`Export failed: ${errorMessage}`);
    } finally {
      setExportLoading(false);
    }
  };

  // Handle database import
  const handleImport = async (values: { password: string }) => {
    if (fileList.length === 0) {
      message.error("Please select a file to import");
      return;
    }

    setImportLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        message.error("Authentication required");
        return;
      }

      const formData = new FormData();
      formData.append("file", fileList[0].originFileObj as File);
      formData.append("password", values.password);

      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/import-database`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Import failed");
      }

      setImportResults(result.results);
      message.success("Database import completed!");
      setImportModalVisible(false);
      importForm.resetFields();
      setFileList([]);
    } catch (error) {
      console.error("Import error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      message.error(`Import failed: ${errorMessage}`);
    } finally {
      setImportLoading(false);
    }
  };

  // Upload props
  const uploadProps = {
    fileList,
    beforeUpload: (file: File) => {
      const isJSON =
        file.type === "application/json" || file.name.endsWith(".json");
      if (!isJSON) {
        message.error("You can only upload JSON files!");
        return false;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error("File must be smaller than 10MB!");
        return false;
      }
      return false; // Prevent auto upload
    },
    onChange: ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
      setFileList(newFileList.slice(-1)); // Keep only the last file
    },
    onRemove: () => {
      setFileList([]);
    },
  };

  if (adminLoading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Text>Loading database management panel...</Text>
      </div>
    );
  }

  if (!isDataAnalyst) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Alert
          message="Access Denied"
          description="You need Data Analyst role to access this page."
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
        <Title level={2}>
          <DatabaseOutlined style={{ marginRight: 8 }} />
          Database Management
        </Title>
        <Tag color="blue">Data Analyst</Tag>
      </div>

      {/* Warning Alert */}
      <Alert
        message="Important Notice"
        description="Database operations are powerful and can affect all system data. Please ensure you have proper backups and understand the implications before proceeding."
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Export Operations"
              value="Secure Backup"
              prefix={<DownloadOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Import Operations"
              value="Data Restore"
              prefix={<UploadOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Security"
              value="Encrypted"
              prefix={<LockOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Actions */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Export Database */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <DownloadOutlined />
                Export Database
              </Space>
            }
            extra={<Tag color="blue">Backup</Tag>}
          >
            <Paragraph>
              Export all database tables to an encrypted JSON file. This creates
              a complete backup of your system data including users, health
              metrics, reports, and configurations.
            </Paragraph>
            <ul>
              <li>All tables are exported</li>
              <li>Data is encrypted with your password</li>
              <li>File is automatically downloaded</li>
              <li>Timestamp included in filename</li>
            </ul>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => setExportModalVisible(true)}
              loading={exportLoading}
              size="large"
              style={{ width: "100%" }}
            >
              Export Database
            </Button>
          </Card>
        </Col>

        {/* Import Database */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <UploadOutlined />
                Import Database
              </Space>
            }
            extra={<Tag color="orange">Restore</Tag>}
          >
            <Paragraph>
              Import data from an encrypted JSON backup file. This will replace
              existing data with the imported data. Use with caution as this
              operation cannot be undone.
            </Paragraph>
            <ul>
              <li>Supports encrypted backup files</li>
              <li>Requires the original password</li>
              <li>Replaces existing data</li>
              <li>Shows detailed import results</li>
            </ul>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setImportModalVisible(true)}
              loading={importLoading}
              size="large"
              style={{ width: "100%" }}
              danger
            >
              Import Database
            </Button>
          </Card>
        </Col>
      </Row>

      {/* Import Results */}
      {importResults && (
        <Card title="Import Results" style={{ marginBottom: 24 }}>
          <List
            dataSource={Object.entries(importResults)}
            renderItem={([tableName, result]) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    result.success ? (
                      <CheckCircleOutlined style={{ color: "#52c41a" }} />
                    ) : (
                      <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                    )
                  }
                  title={tableName}
                  description={
                    <div>
                      <Text type={result.success ? "success" : "danger"}>
                        {result.message}
                      </Text>
                      {result.count !== undefined && (
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          ({result.count} records)
                        </Text>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Export Modal */}
      <Modal
        title={
          <Space>
            <DownloadOutlined />
            Export Database
          </Space>
        }
        open={exportModalVisible}
        onCancel={() => {
          setExportModalVisible(false);
          exportForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Alert
          message="Security Notice"
          description="Your password will be used to encrypt the exported data. Make sure to remember this password as it will be required for importing the data later."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form form={exportForm} onFinish={handleExport} layout="vertical">
          <Form.Item
            name="password"
            label="Encryption Password"
            rules={[{ required: true, message: "Please enter a password" }]}
          >
            <Input.Password
              placeholder="Enter a strong password for encryption"
              prefix={<LockOutlined />}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={exportLoading}
                icon={<DownloadOutlined />}
              >
                Export & Download
              </Button>
              <Button
                onClick={() => {
                  setExportModalVisible(false);
                  exportForm.resetFields();
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Import Modal */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />
            Import Database
          </Space>
        }
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          importForm.resetFields();
          setFileList([]);
        }}
        footer={null}
        width={600}
      >
        <Alert
          message="Danger Zone"
          description="This operation will replace ALL existing data with the imported data. This action cannot be undone. Please ensure you have a current backup before proceeding."
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form form={importForm} onFinish={handleImport} layout="vertical">
          <Form.Item label="Select Backup File" required>
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <FileTextOutlined />
              </p>
              <p className="ant-upload-text">
                Click or drag encrypted backup file to this area
              </p>
              <p className="ant-upload-hint">
                Only JSON files are supported. Maximum file size: 10MB
              </p>
            </Dragger>
          </Form.Item>

          <Form.Item
            name="password"
            label="Decryption Password"
            rules={[
              {
                required: true,
                message: "Please enter the decryption password",
              },
            ]}
          >
            <Input.Password
              placeholder="Enter the password used during export"
              prefix={<LockOutlined />}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={importLoading}
                icon={<UploadOutlined />}
                danger
              >
                Import Database
              </Button>
              <Button
                onClick={() => {
                  setImportModalVisible(false);
                  importForm.resetFields();
                  setFileList([]);
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

export default DatabaseManagementPage;
