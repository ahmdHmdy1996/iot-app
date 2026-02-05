import React, { useState, useEffect } from "react";
import {
  Layout,
  Typography,
  Spin,
  Alert,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Tag,
  message,
  Space,
} from "antd";
import { PlusOutlined, CopyOutlined } from "@ant-design/icons";
import apiService from "../services/api";

const { Content } = Layout;
const { Title } = Typography;

/**
 * Devices Page
 * Device management: list devices and add new ones
 */
const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  /**
   * Fetch devices list
   */
  const fetchDevices = async () => {
    try {
      setError(null);
      const response = await apiService.getDevices();
      setDevices(response.devices || []);
    } catch (err) {
      console.error("Error fetching devices:", err);
      setError(err.message || "فشل في جلب قائمة الأجهزة");
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  /**
   * Copy API key to clipboard
   */
  const copyApiKey = (apiKey) => {
    navigator.clipboard
      .writeText(apiKey)
      .then(() => message.success("تم نسخ مفتاح API"))
      .catch(() => message.error("فشل في النسخ"));
  };

  /**
   * Submit add device form
   */
  const handleSubmit = async (values) => {
    try {
      setSubmitLoading(true);
      await apiService.createDevice({
        name: values.name?.trim() || undefined,
        imei: values.imei?.trim(),
      });
      message.success("تم إضافة الجهاز بنجاح");
      setModalOpen(false);
      form.resetFields();
      await fetchDevices();
    } catch (err) {
      message.error(err.message || "فشل في إضافة الجهاز");
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns = [
    {
      title: "اسم الجهاز",
      dataIndex: "name",
      key: "name",
      render: (name) => name || "—",
    },
    {
      title: "IMEI",
      dataIndex: "imei",
      key: "imei",
      render: (imei) => <Tag color="blue">{imei}</Tag>,
    },
    {
      title: "مفتاح API",
      dataIndex: "apiKey",
      key: "apiKey",
      render: (apiKey) => (
        <Space>
          <span>{apiKey ? `${apiKey.substring(0, 8)}...` : "—"}</span>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copyApiKey(apiKey)}
            title="نسخ المفتاح"
          />
        </Space>
      ),
    },
    {
      title: "الحالة",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive) =>
        isActive ? (
          <Tag color="green">نشط</Tag>
        ) : (
          <Tag color="red">غير نشط</Tag>
        ),
    },
  ];

  if (loading && devices.length === 0) {
    return (
      <Layout style={{ minHeight: "100vh", padding: 24 }}>
        <Content style={{ textAlign: "center", paddingTop: 100 }}>
          <Spin size="large" tip="جاري تحميل البيانات..." />
        </Content>
      </Layout>
    );
  }

  if (error && devices.length === 0) {
    return (
      <Layout style={{ minHeight: "100vh", padding: 24 }}>
        <Content>
          <Alert
            message="خطأ في الاتصال"
            description={error}
            type="error"
            showIcon
          />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Content style={{ padding: 24 }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Title level={2} style={{ margin: 0 }}>
              إدارة الأجهزة
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
            >
              إضافة جهاز
            </Button>
          </div>

          {error && (
            <Alert
              message="تحذير"
              description={error}
              type="warning"
              showIcon
              closable
            />
          )}

          <Card title={`قائمة الأجهزة (${devices.length})`}>
            <Table
              columns={columns}
              dataSource={devices}
              rowKey="imei"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Space>

        <Modal
          title="إضافة جهاز جديد"
          open={modalOpen}
          onCancel={() => {
            setModalOpen(false);
            form.resetFields();
          }}
          footer={null}
          destroyOnClose
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="name"
              label="اسم الجهاز"
            >
              <Input placeholder="اسم الجهاز (اختياري)" />
            </Form.Item>
            <Form.Item
              name="imei"
              label="IMEI"
              rules={[{ required: true, message: "الرجاء إدخال IMEI" }]}
            >
              <Input placeholder="IMEI" />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitLoading}
                >
                  إضافة
                </Button>
                <Button
                  onClick={() => {
                    setModalOpen(false);
                    form.resetFields();
                  }}
                >
                  إلغاء
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
};

export default Devices;
