import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

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
    { path: "/super-admin", label: t("nav.overview"), icon: LayoutDashboard },
    { path: "/super-admin/clients", label: t("nav.clients"), icon: Users },
    { path: "/super-admin/devices", label: t("nav.all_devices"), icon: Server },
    {
      path: "/super-admin/settings",
      label: t("nav.system_settings"),
      icon: Settings,
    },
  ];

  const baseItems = [
    { path: "/", label: t("nav.dashboard"), icon: LayoutDashboard },
  ];
  if (!isSuperAdmin) {
    if (role === "ADMIN") {
      baseItems.push(
        { path: "/devices", label: t("nav.devices"), icon: MonitorSmartphone },
        { path: "/admin/users", label: t("nav.users"), icon: Users },
      );
    } else {
      baseItems.push({
        path: "/devices",
        label: t("nav.my_devices"),
        icon: MonitorSmartphone,
      });
    }
    baseItems.push(
      { path: "/audit", label: t("nav.audit"), icon: FileText },
      { path: "/settings", label: t("nav.settings"), icon: Settings },
    );
  }

  const navItems = isSuperAdmin ? superAdminItems : baseItems;

  return (
    <aside
      className={`fixed top-0 ${isRtl ? "right-0" : "left-0"} w-64 h-screen bg-white ${isRtl ? "border-l" : "border-r"} border-slate-200 flex flex-col z-20`}
      aria-label="Sidebar"
    >
      {/* Logo / Brand */}
      <div className="shrink-0 p-6 bg-white border-b border-slate-100">
        <div className="flex flex-col gap-0.5">
          <span className="text-xl font-semibold tracking-tight text-slate-800">
            {t("brand")}
          </span>
          <span className="text-xs font-medium text-slate-500 tracking-wide">
            {t("brand_sub")}
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
                w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg mb-1 transition-colors
                ${
                  isActive
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
