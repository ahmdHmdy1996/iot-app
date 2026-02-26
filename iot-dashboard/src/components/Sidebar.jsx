import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MonitorSmartphone,
  FileText,
  Settings,
  Users,
  Server,
} from "lucide-react";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch (e) {
      return {};
    }
  })();
  const role = user.role || "CLIENT";
  const isSuperAdmin = role === "SUPER_ADMIN";

  const superAdminItems = [
    { path: "/super-admin", label: "نظرة عامة", icon: LayoutDashboard },
    { path: "/super-admin/clients", label: "إدارة العملاء", icon: Users },
    { path: "/super-admin/devices", label: "جميع الأجهزة", icon: Server },
    { path: "/super-admin/settings", label: "إعدادات النظام", icon: Settings },
  ];

  const baseItems = [
    { path: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  ];
  if (!isSuperAdmin) {
    if (role === "ADMIN") {
      baseItems.push(
        { path: "/devices", label: "إدارة الأجهزة", icon: MonitorSmartphone },
        { path: "/admin/users", label: "إدارة المستخدمين", icon: Users }
      );
    } else {
      baseItems.push({ path: "/devices", label: "أجهزتي", icon: MonitorSmartphone });
    }
    baseItems.push(
      { path: "/audit", label: "سجل التفتيش الصحي", icon: FileText },
      { path: "/settings", label: "الإعدادات", icon: Settings }
    );
  }

  const navItems = isSuperAdmin ? superAdminItems : baseItems;

  return (
    <aside
      className="fixed top-0 right-0 w-64 h-screen bg-white border-l border-slate-200 flex flex-col z-20"
      aria-label="Sidebar"
    >
      {/* Logo area - pure white with typography */}
      <div className="shrink-0 p-6 bg-white border-b border-slate-100">
        <div className="flex flex-col gap-0.5">
          <span className="text-xl font-semibold tracking-tight text-slate-800">
            IoT مراقبة
          </span>
          <span className="text-xs font-medium text-slate-500 tracking-wide">
            درجات الحرارة
          </span>
        </div>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg mx-2 mb-1 transition-colors
                ${isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }
              `}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
