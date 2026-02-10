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

import Sidebar from "./components/Sidebar";

/**
 * Layout with Header + Sidebar + Outlet (for main app routes)
 */
function MainLayout() {
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
        <Sidebar />
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
          {/* All dashboard routes require authentication */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<LiveMonitor />} />
            <Route path="devices" element={<Devices />} />
            <Route path="history" element={<History />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
