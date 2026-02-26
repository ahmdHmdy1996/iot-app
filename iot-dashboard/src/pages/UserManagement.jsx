import React, { useState, useEffect } from "react";
import {
  Tabs,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Table,
  Card,
  message,
  Space,
  Typography,
  Modal,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  EditOutlined,
} from "@ant-design/icons";
import api from "../services/api";

const { TabPane } = Tabs;
const { Title } = Typography;
const { Option } = Select;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editPlanModalOpen, setEditPlanModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editPlanLoading, setEditPlanLoading] = useState(false);
  const [editPlanForm] = Form.useForm();

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const result = await api.getUsers();
      // Handle response structure
      if (Array.isArray(result)) {
        setUsers(result);
      } else if (result.data && Array.isArray(result.data)) {
        setUsers(result.data);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      // message.error("فشل في جلب قائمة المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Create User Form Handler
  const onFinishCreateUser = async (values) => {
    try {
      await api.createUser(values);
      message.success("تم إنشاء المستخدم بنجاح!");
      fetchUsers(); // Refresh list
    } catch (error) {
      message.error("فشل إنشاء المستخدم: " + error.message);
    }
  };

  // Assign Device Form Handler
  const onFinishAssignDevice = async (values) => {
    try {
      await api.assignDeviceToUser({
        userId: values.userId,
        imei: values.imei,
      });
      message.success("تم تعيين الجهاز للمستخدم بنجاح!");
      fetchUsers();
    } catch (error) {
      message.error("فشل تعيين الجهاز: " + error.message);
    }
  };

  const openEditPlanModal = (user) => {
    setEditingUser(user);
    editPlanForm.setFieldsValue({
      plan: user.plan || "BASIC",
      maxDevices: user.maxDevices ?? 5,
    });
    setEditPlanModalOpen(true);
  };

  const closeEditPlanModal = () => {
    setEditPlanModalOpen(false);
    setEditingUser(null);
    editPlanForm.resetFields();
  };

  const onFinishEditPlan = async (values) => {
    if (!editingUser) return;
    try {
      setEditPlanLoading(true);
      await api.updateUserPlan(editingUser.id, {
        plan: values.plan,
        maxDevices: values.maxDevices,
      });
      message.success("تم تحديث الباقة بنجاح");
      closeEditPlanModal();
      fetchUsers();
    } catch (error) {
      message.error("فشل تحديث الباقة: " + error.message);
    } finally {
      setEditPlanLoading(false);
    }
  };

  const columns = [
    {
      title: "معرف المستخدم",
      dataIndex: "id",
      key: "id",
      width: 100,
    },
    {
      title: "اسم المستخدم",
      dataIndex: "username",
      key: "username",
    },
    {
      title: "الدور",
      dataIndex: "role",
      key: "role",
    },
    {
      title: "الباقة",
      dataIndex: "plan",
      key: "plan",
      render: (plan) => plan || "BASIC",
    },
    {
      title: "أقصى أجهزة",
      dataIndex: "maxDevices",
      key: "maxDevices",
      render: (max) => max ?? 5,
    },
    {
      title: "الأجهزة الحالية",
      dataIndex: "deviceCount",
      key: "deviceCount",
      render: (c) => c ?? 0,
    },
    {
      title: "تاريخ الإنشاء",
      dataIndex: "createdAt",
      key: "createdAt",
    },
    {
      title: "إجراءات",
      key: "actions",
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => openEditPlanModal(record)}
        >
          تعديل الباقة
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Title level={2}>إدارة المستخدمين</Title>

      <Card>
        <Tabs defaultActiveKey="1">
          {/* Tab 1: Users List */}
          <TabPane tab="قائمة المستخدمين" key="1">
            <Button onClick={fetchUsers} style={{ marginBottom: 16 }}>
              تحديث القائمة
            </Button>
            <Table
              dataSource={users}
              columns={columns}
              rowKey="id"
              loading={loading}
              locale={{ emptyText: "لا يوجد مستخدمين" }}
            />
          </TabPane>

          {/* Tab 2: Create User */}
          <TabPane tab="إنشاء مستخدم جديد" key="2">
            <Form
              name="create_user"
              layout="vertical"
              onFinish={onFinishCreateUser}
              style={{ maxWidth: 600 }}
            >
              <Form.Item
                name="username"
                label="اسم المستخدم"
                rules={[{ required: true, message: "يرجى إدخال اسم المستخدم" }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Username" />
              </Form.Item>

              <Form.Item
                name="password"
                label="كلمة المرو"
                rules={[{ required: true, message: "يرجى إدخال كلمة المرور" }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Password"
                />
              </Form.Item>

              <Form.Item
                name="role"
                label="الدور"
                initialValue="CLIENT"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="CLIENT">عميل (CLIENT)</Option>
                  <Option value="ADMIN">مدير (ADMIN)</Option>
                </Select>
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit">
                  إنشاء المستخدم
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          {/* Tab 3: Assign Device */}
          <TabPane tab="تعيين جهاز لمستخدم" key="3">
            <Form
              name="assign_device"
              layout="vertical"
              onFinish={onFinishAssignDevice}
              style={{ maxWidth: 600 }}
            >
              <Form.Item
                name="userId"
                label="اختر المستخدم"
                rules={[{ required: true, message: "يرجى اختيار المستخدم" }]}
              >
                <Select placeholder="اختر مستخدم" loading={loading}>
                  {users.map((u) => (
                    <Option key={u.id} value={u.id}>
                      {u.username} ({u.role})
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="imei"
                label="رقم الجهاز (IMEI)"
                rules={[{ required: true, message: "يرجى إدخال IMEI" }]}
              >
                <Input placeholder="Device IMEI" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit">
                  تعيين الجهاز
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title="تعديل الباقة"
        open={editPlanModalOpen}
        onCancel={closeEditPlanModal}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={editPlanForm}
          layout="vertical"
          onFinish={onFinishEditPlan}
        >
          <Form.Item
            name="plan"
            label="الباقة"
            rules={[{ required: true, message: "اختر الباقة" }]}
          >
            <Select>
              <Option value="BASIC">BASIC</Option>
              <Option value="PRO">PRO</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="maxDevices"
            label="أقصى عدد أجهزة"
            rules={[
              { required: true, message: "أدخل العدد" },
              { type: "number", min: 1, message: "الحد الأدنى 1" },
            ]}
          >
            <InputNumber min={1} integer style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={closeEditPlanModal}>إلغاء</Button>
              <Button type="primary" htmlType="submit" loading={editPlanLoading}>
                حفظ
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
