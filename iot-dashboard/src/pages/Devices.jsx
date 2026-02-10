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
import {
  PlusOutlined,
  UserAddOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import apiService from "../services/api";

const { Content } = Layout;
const { Title } = Typography;

/**
 * Devices Page
 * - Admin: View all, Add New, Assign User
 * - Client: View my devices
 */
const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal States
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  // Get User Role
  const userStr = localStorage.getItem("user");
  let role = "CLIENT";
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      role = u.role || "CLIENT";
    } catch (e) {
      /* ignore */
    }
  }

  const isAdmin = role === "ADMIN";

  /**
   * Fetch devices list
   */
  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getDevices();
      // Backend returns { success: true, data: [...] }
      setDevices(response.data || []);
    } catch (err) {
      console.error("Error fetching devices:", err);
      // Backend might return 404/500
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
   * Admin: Add Device
   */
  const handleAddDevice = async (values) => {
    try {
      setSubmitLoading(true);
      await apiService.createDevice({
        name: values.name?.trim() || undefined,
        imei: values.imei?.trim(),
      });
      message.success("تم إضافة الجهاز بنجاح");
      setAddModalOpen(false);
      form.resetFields();
      await fetchDevices();
    } catch (err) {
      message.error(err.message || "فشل في إضافة الجهاز");
    } finally {
      setSubmitLoading(false);
    }
  };

  /**
   * Admin: Assign Device
   */
  const handleAssignDevice = async (values) => {
    try {
      setSubmitLoading(true);
      await apiService.assignDevice({
        imei: values.imei,
        userId: values.userId,
      });
      message.success("تم تخصيص الجهاز للمستخدم بنجاح");
      setAssignModalOpen(false);
      assignForm.resetFields();
      await fetchDevices();
    } catch (err) {
      message.error(err.message || "فشل في تخصيص الجهاز");
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns = [
    {
      title: "اسم الجهاز",
      dataIndex: "name",
      key: "name",
      render: (name, record) => (
        <Link to={`/device/${record.imei}`} style={{ fontWeight: 500 }}>
          {name || "—"}
        </Link>
      ),
    },
    {
      title: "IMEI",
      dataIndex: "imei",
      key: "imei",
      render: (imei) => <Tag color="geekblue">{imei}</Tag>,
    },
    {
      title: "آخر اتصال",
      dataIndex: "lastOnline",
      key: "lastOnline",
      render: (date) =>
        date ? (
          new Date(date).toLocaleString("ar-EG")
        ) : (
          <span style={{ color: "#999" }}>لم يتصل بعد</span>
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

  // Admin Columns
  if (isAdmin) {
    columns.push({
      title: "المستخدم المخصص",
      dataIndex: "assignedTo",
      key: "assignedTo",
      render: (user) =>
        user ? (
          <Tag color="purple">{user}</Tag>
        ) : (
          <Tag color="default">غير مخصص</Tag>
        ),
    });
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
              {isAdmin ? "إدارة المخزون والأجهزة" : "أجهزتي"}
            </Title>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchDevices}
                loading={loading}
              >
                تحديث
              </Button>
              {isAdmin && (
                <>
                  <Button
                    type="dashed"
                    icon={<UserAddOutlined />}
                    onClick={() => setAssignModalOpen(true)}
                  >
                    تخصيص مستخدم
                  </Button>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setAddModalOpen(true)}
                  >
                    إضافة جهاز
                  </Button>
                </>
              )}
            </Space>
          </div>

          {error && (
            <Alert
              message="تنبيه"
              description={error}
              type="warning"
              showIcon
              closable
            />
          )}

          <Card>
            <Table
              columns={columns}
              dataSource={devices}
              rowKey="imei"
              loading={loading}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: "لا توجد أجهزة لعرضها" }}
            />
          </Card>
        </Space>

        {/* Add Device Modal (Admin Only) */}
        <Modal
          title="إضافة جهاز جديد للمخزون"
          open={addModalOpen}
          onCancel={() => setAddModalOpen(false)}
          footer={null}
          destroyOnClose
        >
          <Form form={form} layout="vertical" onFinish={handleAddDevice}>
            <Form.Item name="name" label="اسم الجهاز">
              <Input placeholder="اسم الجهاز" />
            </Form.Item>
            <Form.Item name="imei" label="IMEI" rules={[{ required: true }]}>
              <Input placeholder="IMEI" />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitLoading}
              block
            >
              إضافة
            </Button>
          </Form>
        </Modal>

        {/* Assign Device Modal (Admin Only) */}
        <Modal
          title="تخصيص جهاز لمستخدم"
          open={assignModalOpen}
          onCancel={() => setAssignModalOpen(false)}
          footer={null}
          destroyOnClose
        >
          <Form
            form={assignForm}
            layout="vertical"
            onFinish={handleAssignDevice}
          >
            <Form.Item
              name="imei"
              label="IMEI الجهاز"
              rules={[{ required: true }]}
            >
              <Input placeholder="ادخل IMEI" />
            </Form.Item>
            <Form.Item
              name="userId"
              label="معرف المستخدم (ID)"
              rules={[{ required: true }]}
            >
              <Input type="number" placeholder="ID المستخدم" />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitLoading}
              block
            >
              تخصيص
            </Button>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
};

export default Devices;
