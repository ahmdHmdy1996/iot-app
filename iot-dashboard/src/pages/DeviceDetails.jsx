import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  AreaChart,
  Area,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Thermometer, Droplet, Battery, Wifi, WifiOff, ChevronLeft, ChevronRight } from "lucide-react";
import moment from "moment";
import api from "../services/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DEFAULT_PAGE_SIZE = 10;

const alertTypeLabel = (type) => {
  const map = {
    TEMPERATURE_HIGH: "حرارة عالية",
    TEMPERATURE_LOW: "حرارة منخفضة",
    OFFLINE: "غير متصل",
  };
  return map[type] || type;
};

const DeviceDetails = () => {
  const { imei } = useParams();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const fetchDashboardData = useCallback(async () => {
    if (!imei) return;
    try {
      setLoading(true);
      setError(null);
      const response = await api.getDeviceDashboard(imei);
      setDashboardData(response);
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
      setError("فشل في جلب البيانات.");
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  }, [imei]);

  const fetchAlerts = useCallback(async () => {
    if (!imei) return;
    try {
      setAlertsLoading(true);
      const result = await api.getAlerts(imei, 50);
      setAlerts(result.alerts || []);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setAlertsLoading(false);
    }
  }, [imei]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const currentTemp = dashboardData?.currentReading?.temperature ?? null;
  const currentHumidity = dashboardData?.currentReading?.humidity ?? null;
  const device = dashboardData?.device ?? null;

  const tempColor =
    currentTemp == null
      ? undefined
      : device?.maxTemp != null && currentTemp > device.maxTemp
        ? "red"
        : device?.minTemp != null && currentTemp < device.minTemp
          ? "blue"
          : "green";

  const sortedAlerts = useMemo(
    () => [...alerts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [alerts]
  );

  const totalPages = Math.max(1, Math.ceil(sortedAlerts.length / pageSize));
  const paginatedAlerts = useMemo(
    () =>
      sortedAlerts.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedAlerts, currentPage, pageSize]
  );

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [currentPage, totalPages]);

  const getAlertBadgeVariant = (alertType) => {
    if (alertType === "TEMPERATURE_HIGH" || alertType === "TEMPERATURE_LOW") return "destructive";
    return "secondary";
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[320px]" dir="rtl">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      </div>
    );
  }

  const chartData = dashboardData?.chartData ?? [];
  const dailyStats = dashboardData?.dailyStats ?? { maxTemp: null, minTemp: null, avgTemp: null };

  return (
    <div dir="rtl" className="text-right">
      <h1 className="text-2xl font-bold text-slate-900 mb-7">
        تفاصيل الجهاز:{" "}
        <span className="font-mono font-semibold">{dashboardData?.device?.name ?? imei}</span>
      </h1>

      {error && (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          خطأ — {error}
        </div>
      )}

      {/* Hero KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-7">
        <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div
                className={`p-2 rounded-full shrink-0 ${
                  tempColor === "red"
                    ? "bg-red-50 text-red-600"
                    : tempColor === "blue"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-emerald-50 text-emerald-600"
                } ${!tempColor ? "bg-slate-100 text-slate-500" : ""}`}
              >
                <Thermometer className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-500 mb-1">درجة الحرارة الحالية</p>
                <p
                  className={`text-2xl font-bold ${
                    tempColor === "red"
                      ? "text-red-600"
                      : tempColor === "blue"
                        ? "text-blue-600"
                        : tempColor === "green"
                          ? "text-emerald-600"
                          : "text-slate-900"
                  }`}
                >
                  {currentTemp != null ? `${Number(currentTemp).toFixed(1)}°C` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="p-2 rounded-full shrink-0 bg-blue-50 text-blue-600">
                <Droplet className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-500 mb-1">الرطوبة الحالية</p>
                <p className="text-2xl font-bold text-slate-900">
                  {currentHumidity != null ? `${Number(currentHumidity).toFixed(1)}%` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div
                className={`p-2 rounded-full shrink-0 ${
                  device?.batteryLevel != null && device.batteryLevel < 20
                    ? "bg-red-50 text-red-600"
                    : "bg-emerald-50 text-emerald-600"
                } ${device?.batteryLevel == null ? "bg-slate-100 text-slate-500" : ""}`}
              >
                <Battery className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-500 mb-1">حالة البطارية</p>
                <p
                  className={`text-2xl font-bold ${
                    device?.batteryLevel != null && device.batteryLevel < 20
                      ? "text-red-600"
                      : "text-slate-900"
                  }`}
                >
                  {device?.batteryLevel != null ? `${device.batteryLevel}%` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div
                className={`p-2 rounded-full shrink-0 ${
                  device?.isOffline ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {device?.isOffline ? (
                  <WifiOff className="h-6 w-6" />
                ) : (
                  <Wifi className="h-6 w-6" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-500 mb-1">حالة الجهاز</p>
                <p className="text-2xl font-bold text-slate-900">
                  {device?.isOffline ? "غير متصل" : "متصل"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Chart 1: Main Temperature – full width */}
        <Card className="rounded-xl border-slate-100 bg-white shadow-sm col-span-1 lg:col-span-2">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-lg font-semibold text-slate-900">
              درجة الحرارة عبر الزمن
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(time) => moment(time).format("HH:mm")}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <Tooltip
                    labelFormatter={(label) => moment(label).format("YYYY-MM-DD HH:mm")}
                    formatter={(value) => [`${Number(value).toFixed(1)}°C`, "درجة الحرارة"]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #f1f5f9",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    }}
                    cursor={{ stroke: "#e2e8f0", strokeWidth: 1, strokeDasharray: "3 3" }}
                  />
                  {device?.maxTemp != null && (
                    <ReferenceLine
                      y={device.maxTemp}
                      stroke="#ef4444"
                      strokeDasharray="5 5"
                      label={{ value: "الحد الأعلى", position: "right" }}
                    />
                  )}
                  {device?.minTemp != null && (
                    <ReferenceLine
                      y={device.minTemp}
                      stroke="#3b82f6"
                      strokeDasharray="5 5"
                      label={{ value: "الحد الأدنى", position: "right" }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="temperature"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fill="url(#tempGradient)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: "#3b82f6" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Temp vs Humidity correlation */}
        <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-lg font-semibold text-slate-900">
              الحرارة والرطوبة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 50, left: 10, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="humidityAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(time) => moment(time).format("HH:mm")}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    yAxisId="temp"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    tickFormatter={(v) => `${v}°`}
                  />
                  <YAxis
                    yAxisId="humidity"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    labelFormatter={(label) => moment(label).format("YYYY-MM-DD HH:mm")}
                    formatter={(value, name) => [
                      name === "temperature" ? `${Number(value).toFixed(1)}°C` : `${Number(value).toFixed(1)}%`,
                      name === "temperature" ? "درجة الحرارة" : "الرطوبة",
                    ]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #f1f5f9",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    }}
                    cursor={{ stroke: "#e2e8f0", strokeWidth: 1, strokeDasharray: "3 3" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="humidity"
                    yAxisId="humidity"
                    fill="url(#humidityAreaGradient)"
                    fillOpacity={1}
                    stroke="none"
                    name="humidity"
                  />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    yAxisId="temp"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    dot={false}
                    name="temperature"
                    activeDot={{ r: 6, strokeWidth: 0, fill: "#f43f5e" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 3: Battery / Voltage trend */}
        <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-lg font-semibold text-slate-900">
              اتجاه الجهد / الطاقة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="voltageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(time) => moment(time).format("HH:mm")}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    tickFormatter={(v) => `${v}V`}
                  />
                  <Tooltip
                    labelFormatter={(label) => moment(label).format("YYYY-MM-DD HH:mm")}
                    formatter={(value) => [value != null ? `${Number(value).toFixed(2)}V` : "—", "الجهد"]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #f1f5f9",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    }}
                    cursor={{ stroke: "#e2e8f0", strokeWidth: 1, strokeDasharray: "3 3" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="voltage"
                    stroke="#22c55e"
                    strokeWidth={3}
                    fill="url(#voltageGradient)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: "#22c55e" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
        <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-slate-500 mb-2">أعلى حرارة اليوم</p>
            <p className="text-2xl font-bold text-slate-900">
              {dailyStats.maxTemp != null ? `${Number(dailyStats.maxTemp).toFixed(1)}°C` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-slate-500 mb-2">أدنى حرارة اليوم</p>
            <p className="text-2xl font-bold text-slate-900">
              {dailyStats.minTemp != null ? `${Number(dailyStats.minTemp).toFixed(1)}°C` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-slate-500 mb-2">متوسط الحرارة اليوم</p>
            <p className="text-2xl font-bold text-slate-900">
              {dailyStats.avgTemp != null ? `${Number(dailyStats.avgTemp).toFixed(1)}°C` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Paginated Alerts Table */}
      <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900">
            سجل التنبيهات
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {alertsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            </div>
          ) : sortedAlerts.length === 0 ? (
            <p className="text-sm text-slate-500 py-6">لا توجد تنبيهات</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-right font-semibold text-slate-700">التاريخ والوقت</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">نوع التنبيه</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">الرسالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAlerts.map((alert) => (
                    <TableRow key={alert.id ?? alert.timestamp} className="border-slate-100">
                      <TableCell className="text-right text-slate-700">
                        {moment(alert.timestamp).format("YYYY-MM-DD HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getAlertBadgeVariant(alert.alertType)}>
                          {alertTypeLabel(alert.alertType)}
                        </Badge>
                        {alert.resolved && (
                          <Badge variant="secondary" className="ms-2 text-xs">
                            تم الحل
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-slate-600">
                        {alert.message || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  الصفحة {currentPage} من {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="gap-1"
                  >
                    <ChevronRight className="w-4 h-4" />
                    السابق
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="gap-1"
                  >
                    التالي
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceDetails;
