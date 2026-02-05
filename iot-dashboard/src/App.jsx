import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  Outlet,
} from "react-router-dom";
import { Layout, Menu } from "antd";
import {
  DashboardOutlined,
  DesktopOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { ConfigProvider } from "antd";
import arEG from "antd/locale/ar_EG";
import LiveMonitor from "./pages/LiveMonitor";
import History from "./pages/History";
import Devices from "./pages/Devices";
import Login from "./pages/Login";
import PrivateRoute from "./components/PrivateRoute";
import "./App.css";

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: "/", icon: <DashboardOutlined />, label: "المراقبة الحية" },
  { key: "/history", icon: <HistoryOutlined />, label: "السجل والتحليلات" },
  { key: "/devices", icon: <DesktopOutlined />, label: "إدارة الأجهزة" },
];

/**
 * Layout with Header + Sidebar + Outlet (for main app routes)
 */
function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          background: "#001529",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            color: "white",
            fontSize: 20,
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <ThunderboltOutlined />
          <span>نظام مراقبة درجات الحرارة IoT</span>
        </div>
      </Header>
      <Layout>
        <Sider
          width={250}
          style={{ background: "#fff" }}
          breakpoint="lg"
          collapsedWidth="0"
        >
          <Menu
            mode="inline"
            selectedKeys={[currentPath]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ height: "100%", borderLeft: 0 }}
          />
        </Sider>
        <Layout style={{ padding: 0 }}>
          <Content>
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

/**
 * Main App Component
 */
function App() {
  return (
    <ConfigProvider
      locale={arEG}
      direction="rtl"
      theme={{
        token: {
          colorPrimary: "#1890ff",
          borderRadius: 8,
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<MainLayout />}>
            <Route index element={<LiveMonitor />} />
            <Route
              path="devices"
              element={
                <PrivateRoute>
                  <Devices />
                </PrivateRoute>
              }
            />
            <Route
              path="history"
              element={
                <PrivateRoute>
                  <History />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
