import React, { useState, useEffect } from "react";
import { Users, Server, AlertTriangle, Activity, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "../services/api";

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDevices: 0,
    activeAlerts: 0,
    serverStatus: "Online",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.getSystemStats();
        if (res?.success && res.stats) {
          setStats(res.stats);
        }
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);
  return (
    <div dir="rtl" className="text-right">
      {/* Hero Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          لوحة تحكم النظام (Super Admin)
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          نظرة عامة على العملاء والأجهزة وحالة الخادم
        </p>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-10 w-10 animate-spin mb-4" />
          <p className="text-sm font-medium">جاري تحميل الإحصائيات...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                إجمالي العملاء
              </CardTitle>
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                <Users className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">
                {stats.totalUsers}
              </p>
              <p className="text-xs text-slate-500 mt-1">عميل مسجّل</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                إجمالي الأجهزة النشطة
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Server className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">
                {stats.totalDevices}
              </p>
              <p className="text-xs text-slate-500 mt-1">جهاز مسجل في النظام</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                التنبيهات المفتوحة
              </CardTitle>
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${stats.activeAlerts > 0 ? "text-red-500" : "text-green-500"}`}
              >
                {stats.activeAlerts}
              </p>
              <p className="text-xs text-slate-500 mt-1">تنبيه غير محلول</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                حالة الخادم
              </CardTitle>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Activity className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.serverStatus}
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-1">متصل ويعمل</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
