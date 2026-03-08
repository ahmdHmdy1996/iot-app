import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import moment from "moment";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import apiService from "../services/api";
import { CHART_COLORS } from "../config/constants";
import { useTranslation } from "react-i18next";

// Default date range: last 7 days
function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

/**
 * History Page — shadcn/ui redesign with date range picker
 * Shows historical readings with chart, table, and export functionality
 */
const History = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const dateLang = i18n.language === "ar" ? "ar-EG" : "en-US";

  const [devices, setDevices] = useState([]);
  const [selectedImei, setSelectedImei] = useState("");

  const defaults = defaultDateRange();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);

  const [readings, setReadings] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch devices list on mount
  useEffect(() => {
    const init = async () => {
      try {
        setLoadingDevices(true);
        const res = await apiService.getDevices();
        const deviceList = res.data || [];
        setDevices(deviceList);
        if (deviceList.length > 0) {
          setSelectedImei(deviceList[0].imei);
        }
      } catch (err) {
        console.error(err);
        setError("فشل في جلب الأجهزة");
      } finally {
        setLoadingDevices(false);
      }
    };
    init();
  }, []);

  // Fetch readings for the selected date range
  const fetchHistory = useCallback(async () => {
    if (!selectedImei || !dateFrom || !dateTo) {
      setError("يرجى اختيار الجهاز وتحديد الفترة الزمنية");
      return;
    }
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    try {
      setFetching(true);
      setError("");
      const response = await apiService.getHistory(selectedImei, {
        startDate: from.toISOString(),
        endDate: to.toISOString(),
      });
      setReadings(response.readings || []);
      setHasFetched(true);
    } catch (err) {
      console.error("Error fetching history:", err);
      setError(err.message || "فشل في جلب البيانات التاريخية");
      setReadings([]);
    } finally {
      setFetching(false);
    }
  }, [selectedImei, dateFrom, dateTo]);

  // Export to Excel
  const exportToExcel = () => {
    const exportData = readings.map((item) => ({
      التاريخ: moment(item.timestamp).format("YYYY-MM-DD"),
      الوقت: moment(item.timestamp).format("HH:mm:ss"),
      "الحرارة (°C)": item.temperature,
      "الرطوبة (%)": item.humidity ?? "-",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "البيانات");
    XLSX.writeFile(wb, `readings-${selectedImei}-${dateFrom}_${dateTo}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Readings: ${selectedImei}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${dateFrom} → ${dateTo}`, 14, 22);
    doc.text(`Generated: ${moment().format("YYYY-MM-DD HH:mm")}`, 14, 28);
    const tableData = readings.map((item) => [
      moment(item.timestamp).format("YYYY-MM-DD"),
      moment(item.timestamp).format("HH:mm:ss"),
      `${item.temperature}°C`,
      item.humidity != null ? `${item.humidity}%` : "-",
    ]);
    doc.autoTable({
      head: [["Date", "Time", "Temperature", "Humidity"]],
      body: tableData,
      startY: 34,
    });
    doc.save(`readings-${selectedImei}-${dateFrom}.pdf`);
  };

  // Chart data (ascending by time)
  const chartData = readings.map((item) => ({
    time: moment(item.timestamp)
      .locale(i18n.language === "ar" ? "ar" : "en")
      .format("MM/DD HH:mm"),
    temperature: item.temperature,
    humidity: item.humidity,
  }));

  const hasData = readings.length > 0;

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={isRtl ? "text-right" : "text-left"}
    >
      {/* ── Header ── */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t("history.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("history.subtitle")}</p>
        </div>
        {hasData && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportToExcel}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>
        )}
      </header>

      {/* ── Filters Card ── */}
      <Card className="rounded-xl border-slate-100 bg-white shadow-sm mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Device Select */}
            <div className="space-y-2">
              <Label>{t("history.label_device")}</Label>
              {loadingDevices ? (
                <div className="flex items-center gap-2 h-10 px-3 text-sm text-slate-500 border border-slate-200 rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </div>
              ) : (
                <Select value={selectedImei} onValueChange={setSelectedImei}>
                  <SelectTrigger className={isRtl ? "text-right" : "text-left"}>
                    <SelectValue placeholder={t("history.select_device")} />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((d) => (
                      <SelectItem key={d.imei} value={d.imei}>
                        {d.name || d.imei}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* From Date */}
            <div className="space-y-2">
              <Label htmlFor="hist-from">{t("history.label_from")}</Label>
              <Input
                id="hist-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={isRtl ? "text-right" : "text-left"}
              />
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <Label htmlFor="hist-to">{t("history.label_to")}</Label>
              <Input
                id="hist-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={isRtl ? "text-right" : "text-left"}
              />
            </div>

            {/* Action */}
            <Button onClick={fetchHistory} disabled={fetching || !selectedImei}>
              {fetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {t("history.btn_view")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Error Banner ── */}
      {error && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="text-amber-600 hover:text-amber-800 font-medium text-xs"
          >
            {t("common.close")}
          </button>
        </div>
      )}

      {/* ── Loading ── */}
      {fetching && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <p className="text-sm">{t("history.loading_data")}</p>
        </div>
      )}

      {/* ── Empty: not fetched yet ── */}
      {!fetching && !hasFetched && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Search className="h-12 w-12 mb-4 stroke-1" />
          <p className="text-base font-medium text-slate-500">
            {t("history.empty_prompt")}
          </p>
        </div>
      )}

      {/* ── Empty: fetched but no data ── */}
      {!fetching && hasFetched && !hasData && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <TrendingUp className="h-12 w-12 mb-4 stroke-1" />
          <p className="text-base font-medium text-slate-500">
            {t("history.empty_no_data_pre")} {dateFrom}{" "}
            {t("history.empty_no_data_to")} {dateTo}
          </p>
        </div>
      )}

      {/* ── Chart ── */}
      {!fetching && hasData && (
        <Card className="rounded-xl border-slate-100 bg-white shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              {t("history.chart_title")}
              <Badge
                variant="secondary"
                className="bg-slate-100 text-slate-600 ms-auto"
              >
                {readings.length} {t("history.readings_count")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperature"
                  stroke={CHART_COLORS?.TEMPERATURE ?? "#ef4444"}
                  name={t("history.temp_series")}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="humidity"
                  stroke={CHART_COLORS?.HUMIDITY ?? "#3b82f6"}
                  name={t("history.humidity_series")}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Data Table ── */}
      {!fetching && hasData && (
        <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">
              {t("history.table_title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead
                    className={`${isRtl ? "text-right" : "text-left"} font-medium text-slate-600`}
                  >
                    {t("history.col_datetime")}
                  </TableHead>
                  <TableHead
                    className={`${isRtl ? "text-right" : "text-left"} font-medium text-slate-600`}
                  >
                    {t("history.col_temp")}
                  </TableHead>
                  <TableHead
                    className={`${isRtl ? "text-right" : "text-left"} font-medium text-slate-600`}
                  >
                    {t("history.col_humidity")}
                  </TableHead>
                  <TableHead
                    className={`${isRtl ? "text-right" : "text-left"} font-medium text-slate-600`}
                  >
                    {t("history.col_status")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readings.map((item) => (
                  <TableRow
                    key={item.id ?? item.timestamp}
                    className="border-slate-100"
                  >
                    <TableCell
                      className={`${isRtl ? "text-right" : "text-left"} text-slate-700`}
                    >
                      <div>
                        <span className="font-medium">
                          {new Date(item.timestamp).toLocaleDateString(
                            dateLang,
                          )}
                        </span>
                        <span className="text-slate-400 ms-2 text-xs">
                          {new Date(item.timestamp).toLocaleTimeString(
                            dateLang,
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            },
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className={`${isRtl ? "text-right" : "text-left"} font-mono`}
                    >
                      <span
                        className={
                          item.temperature > 10
                            ? "text-red-600 font-semibold"
                            : "text-emerald-600 font-semibold"
                        }
                      >
                        {item.temperature}°C
                      </span>
                    </TableCell>
                    <TableCell
                      className={`${isRtl ? "text-right" : "text-left"} text-slate-700`}
                    >
                      {item.humidity != null ? `${item.humidity}%` : "—"}
                    </TableCell>
                    <TableCell className={isRtl ? "text-right" : "text-left"}>
                      {item.temperature > 10 ? (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0">
                          {t("history.status_high")}
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
                          {t("history.status_normal")}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default History;
