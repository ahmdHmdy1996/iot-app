import React, { useState } from "react";
import { Card, Form, Input, Button, Typography, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import apiService from "../services/api";
import { AUTH_TOKEN_KEY } from "../config/constants";

const { Title } = Typography;

/**
 * Login Page – Arabic, RTL, centered card
 */
const Login = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      console.log("[Login Debug] Attempting login for:", values.username);
      const res = await apiService.login({
        username: values.username,
        password: values.password,
      });
      console.log("[Login Debug] Response:", res);
      if (res?.success && res?.token) {
        console.log("[Login Debug] Token received, length:", res.token.length);
        localStorage.setItem(AUTH_TOKEN_KEY, res.token);
        // Store user info for context
        localStorage.setItem(
          "user",
          JSON.stringify({ username: values.username }),
        );
        message.success("تم تسجيل الدخول بنجاح");
        navigate("/", { replace: true });
      } else {
        console.error("[Login Debug] No token in response:", res);
        message.error("فشل تسجيل الدخول");
      }
    } catch (err) {
      console.error("[Login Debug] Error:", err);
      message.error(err?.message || "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f2f5",
        padding: 24,
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>
          تسجيل الدخول
        </Title>
        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          layout="vertical"
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="username"
            label="اسم المستخدم"
            rules={[{ required: true, message: "يرجى إدخال اسم المستخدم" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="اسم المستخدم" />
          </Form.Item>
          <Form.Item
            name="password"
            label="كلمة المرور"
            rules={[{ required: true, message: "يرجى إدخال كلمة المرور" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="كلمة المرور"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              دخول
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
