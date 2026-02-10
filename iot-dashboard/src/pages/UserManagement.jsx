import React, { useState, useEffect } from "react";
import {
  Tabs,
  Form,
  Input,
  Select,
  Button,
  Table,
  Card,
  message,
  Space,
  Typography,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  safetyCertificateOutlined,
} from "@ant-design/icons";
import api from "../services/api";

const { TabPane } = Tabs;
const { Title } = Typography;
const { Option } = Select;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

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
        username: values.username, // Using username or userId based on your backend
        imei: values.imei,
      });
      message.success("تم تعيين الجهاز للمستخدم بنجاح!");
    } catch (error) {
      message.error("فشل تعيين الجهاز: " + error.message);
    }
  };

  const columns = [
    {
      title: "معرف المستخدم",
      dataIndex: "id",
      key: "id",
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
      title: "تاريخ الإنشاء",
      dataIndex: "createdAt",
      key: "createdAt",
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
                name="username"
                label="اختر المستخدم"
                rules={[{ required: true, message: "يرجى اختيار المستخدم" }]}
              >
                {/* Dynamically populate users if available, else plain input */}
                <Select placeholder="اختر مستخدم" loading={loading}>
                  {users.map((u) => (
                    <Option key={u.id} value={u.username}>
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
    </div>
  );
};

export default UserManagement;
