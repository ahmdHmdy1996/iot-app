import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import LiveMonitor from "./pages/LiveMonitor";
import History from "./pages/History";
import Devices from "./pages/Devices";
import DeviceDetails from "./pages/DeviceDetails";
import UserManagement from "./pages/UserManagement";
import Settings from "./pages/Settings";
import AuditReport from "./pages/AuditReport";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminClients from "./pages/SuperAdminClients";
import SuperAdminDevices from "./pages/SuperAdminDevices";
import SuperAdminSettings from "./pages/SuperAdminSettings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PrivateRoute from "./components/PrivateRoute";
import Sidebar from "./components/Sidebar";
import { AUTH_TOKEN_KEY } from "./config/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/**
 * Layout with Header + Sidebar + Outlet (Tailwind + shadcn, light theme)
 */
function MainLayout() {
  const userStr = localStorage.getItem("user");
  let userName = "مستخدم";
  let userRole = "CLIENT";
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      userName =
        u.name || u.username || (u.role === "ADMIN" ? "المدير" : "العميل");
      userRole = u.role || "CLIENT";
    } catch (e) {
      /* ignore */
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <div
      className="flex h-screen overflow-hidden bg-slate-50 text-slate-900"
      dir="rtl"
    >
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen mr-64 overflow-hidden">
        <header className="shrink-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6">
          <div />
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors outline-none">
              <Avatar className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">
                <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm text-slate-700">
                {userName}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-slate-900">
                    {userName}
                  </span>
                  <span className="text-xs text-slate-500">
                    {userRole === "SUPER_ADMIN"
                      ? "المشرف الأعلى"
                      : userRole === "ADMIN"
                        ? "مدير النظام"
                        : "عميل"}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-700 focus:bg-red-50"
              >
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/**
 * Main App Component
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
          <Route path="audit" element={<AuditReport />} />
          <Route path="device/:imei" element={<DeviceDetails />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin/users" element={<UserManagement />} />
          <Route path="super-admin" element={<SuperAdminDashboard />} />
          <Route path="super-admin/clients" element={<SuperAdminClients />} />
          <Route path="super-admin/devices" element={<SuperAdminDevices />} />
          <Route path="super-admin/settings" element={<SuperAdminSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
