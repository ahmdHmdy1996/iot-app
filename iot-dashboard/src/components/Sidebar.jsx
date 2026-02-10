import React from "react";
import { Layout, Menu } from "antd";
import {
  DashboardOutlined,
  DesktopOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { AUTH_TOKEN_KEY } from "../config/constants";

const { Sider } = Layout;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

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

  // Menu Items Config
  const items = [];

  // Common Items
  // items.push({ key: "/", icon: <DashboardOutlined />, label: "المراقبة الحية" });

  if (role === "ADMIN") {
    items.push(
      { key: "/devices", icon: <DesktopOutlined />, label: "إدارة الأجهزة" },
      {
        key: "/admin/users",
        icon: <UserOutlined />,
        label: "إدارة المستخدمين",
      },
    );
  } else {
    // Client Items
    items.push(
      { key: "/", icon: <DashboardOutlined />, label: "لوحة التحكم" }, // Live Monitor
      { key: "/devices", icon: <DesktopOutlined />, label: "أجهزتي" },
      // { key: "/history", icon: <HistoryOutlined />, label: "السجل" }
    );
  }

  // Logout (Bottom)
  items.push({ type: "divider" });
  items.push({
    key: "logout",
    icon: <LogoutOutlined />,
    label: "تسجيل الخروج",
    danger: true,
  });

  const handleMenuClick = ({ key }) => {
    if (key === "logout") {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem("user");
      navigate("/login");
    } else {
      navigate(key);
    }
  };

  return (
    <Sider
      width={250}
      style={{ background: "#fff" }}
      breakpoint="lg"
      collapsedWidth="0"
    >
      <div style={{ padding: "16px", textAlign: "center", fontWeight: "bold" }}>
        مرحباً، {role === "ADMIN" ? "المدير" : "العميل"}
      </div>
      <Menu
        mode="inline"
        selectedKeys={[currentPath]}
        items={items}
        onClick={handleMenuClick}
        style={{ height: "100%", borderLeft: 0 }}
      />
    </Sider>
  );
};

export default Sidebar;
