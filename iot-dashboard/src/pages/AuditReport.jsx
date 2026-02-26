import React, { useState, useEffect } from "react";
import { Search, Download, Loader2, Printer } from "lucide-react";
import moment from "moment";
import "moment/locale/ar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import apiService from "../services/api";

/**
 * Combine readings + alerts into a single sorted list for the report table.
 */
function buildCombinedRows(readings = [], alerts = []) {
  const readingRows = readings.map((r) => ({
    key: `r-${r.id}`,
    timestamp: r.timestamp,
    type: "قراءة",
    temperature: r.temperature,
    humidity: r.humidity ?? "—",
    message: "—",
  }));
  const alertRows = alerts.map((a) => ({
    key: `a-${a.id}`,
    timestamp: a.timestamp,
    type: "تنبيه",
    temperature: "—",
    humidity: "—",
    message: a.message,
  }));
  return [...readingRows, ...alertRows].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
  );
}

/**
 * Determine row status based on temperature vs device thresholds.
 */
function getTemperatureStatus(temp, device) {
  if (typeof temp !== "number") return null;
  if (device?.maxTemp != null && temp > device.maxTemp) return "high";
  if (device?.minTemp != null && temp < device.minTemp) return "low";
  return "normal";
}

const AuditReport = () => {
  const [devices, setDevices] = useState([]);
  const [selectedImei, setSelectedImei] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [device, setDevice] = useState(null);
  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingReport, setFetchingReport] = useState(false);
  const [error, setError] = useState("");

  // Fetch devices on mount
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
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
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadReport = async () => {
    if (!selectedImei || !dateFrom || !dateTo) {
      setError("يرجى اختيار الجهاز وتاريخ البداية والنهاية.");
      return;
    }
    const fromDate = new Date(dateFrom);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);

    try {
      setFetchingReport(true);
      setError("");
      const res = await apiService.getAuditReport(
        selectedImei,
        fromDate,
        toDate,
      );
      setDevice(res.device);
      setReadings(res.readings || []);
      setAlerts(res.alerts || []);
    } catch (err) {
      setError(err.message || "فشل في جلب التقرير");
      setDevice(null);
      setReadings([]);
      setAlerts([]);
    } finally {
      setFetchingReport(false);
    }
  };

  const handlePrint = () => window.print();

  const combinedData = buildCombinedRows(readings, alerts);
  const hasReport = device && (readings.length > 0 || alerts.length > 0);

  return (
    <div dir="rtl" className="text-right audit-report-page">
      {/* ── Print Styles ── */}
      <style>{`
        @media print {
          .no-print, nav, aside, header { display: none !important; }
          .audit-report-page { padding: 0 !important; }
          body * { visibility: hidden; }
          .audit-report-page, .audit-report-page * { visibility: visible; }
          .audit-report-page { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {/* ── Header ── */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          سجل التفتيش الصحي
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          استخراج تقارير الحرارة والرطوبة وطباعتها
        </p>
      </header>

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Filters Card                                             */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Card className="rounded-xl border-slate-100 bg-white shadow-sm mb-6 no-print">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Filter 1: Device Select */}
            <div className="space-y-2">
              <Label>الجهاز</Label>
              {loading ? (
                <div className="flex items-center gap-2 h-10 px-3 text-sm text-slate-500 border border-slate-200 rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري التحميل...
                </div>
              ) : (
                <Select value={selectedImei} onValueChange={setSelectedImei}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر الجهاز" />
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

            {/* Filter 2: From Date */}
            <div className="space-y-2">
              <Label htmlFor="date-from">من تاريخ</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-right"
              />
            </div>

            {/* Filter 3: To Date */}
            <div className="space-y-2">
              <Label htmlFor="date-to">إلى تاريخ</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-right"
              />
            </div>

            {/* Filter 4: Action Buttons */}
            <div className="flex items-end gap-2">
              <Button onClick={loadReport} disabled={fetchingReport}>
                {fetchingReport ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Search className="h-4 w-4 ml-2" />
                )}
                عرض التقرير
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
                disabled={!hasReport}
              >
                <Printer className="h-4 w-4 ml-2" />
                طباعة
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Error Banner ── */}
      {error && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 no-print flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="text-amber-600 hover:text-amber-800 font-medium text-xs"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* ── Loading Spinner ── */}
      {fetchingReport && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <p className="text-sm">جاري تحميل التقرير...</p>
        </div>
      )}

      {/* ── Device Info Summary ── */}
      {!fetchingReport && hasReport && (
        <Card className="rounded-xl border-slate-100 bg-white shadow-sm mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900">
              بيانات الجهاز
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="font-medium text-slate-600">IMEI: </span>
                <span className="font-mono text-slate-900">{device.imei}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">الاسم: </span>
                <span className="text-slate-900">{device.name || "—"}</span>
              </div>
              {device.minTemp != null && (
                <div>
                  <span className="font-medium text-slate-600">
                    الحد الأدنى:{" "}
                  </span>
                  <span className="text-slate-900">{device.minTemp}°C</span>
                </div>
              )}
              {device.maxTemp != null && (
                <div>
                  <span className="font-medium text-slate-600">
                    الحد الأقصى:{" "}
                  </span>
                  <span className="text-slate-900">{device.maxTemp}°C</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Report Table                                             */}
      {/* ══════════════════════════════════════════════════════════ */}
      {!fetchingReport && hasReport && (
        <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">
              سجل القراءات والتنبيهات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-right font-medium text-slate-600">
                    الوقت والتاريخ
                  </TableHead>
                  <TableHead className="text-right font-medium text-slate-600">
                    النوع
                  </TableHead>
                  <TableHead className="text-right font-medium text-slate-600">
                    درجة الحرارة
                  </TableHead>
                  <TableHead className="text-right font-medium text-slate-600">
                    الرطوبة
                  </TableHead>
                  <TableHead className="text-right font-medium text-slate-600">
                    الحالة
                  </TableHead>
                  <TableHead className="text-right font-medium text-slate-600">
                    الملاحظات
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinedData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-slate-500"
                    >
                      لا توجد بيانات لهذا النطاق الزمني
                    </TableCell>
                  </TableRow>
                ) : (
                  combinedData.map((row) => {
                    const status = getTemperatureStatus(
                      row.temperature,
                      device,
                    );
                    return (
                      <TableRow key={row.key} className="border-slate-100">
                        {/* الوقت والتاريخ */}
                        <TableCell className="text-right text-slate-700">
                          <div>
                            <span className="font-medium">
                              {moment(row.timestamp).format("YYYY-MM-DD")}
                            </span>
                            <span className="text-slate-400 mr-2 text-xs">
                              {moment(row.timestamp).format("HH:mm:ss")}
                            </span>
                          </div>
                        </TableCell>

                        {/* النوع */}
                        <TableCell className="text-right">
                          {row.type === "تنبيه" ? (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">
                              تنبيه
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-0"
                            >
                              قراءة
                            </Badge>
                          )}
                        </TableCell>

                        {/* درجة الحرارة */}
                        <TableCell className="text-right font-mono text-slate-700">
                          {typeof row.temperature === "number"
                            ? `${row.temperature}°C`
                            : "—"}
                        </TableCell>

                        {/* الرطوبة */}
                        <TableCell className="text-right text-slate-700">
                          {row.humidity !== "—" ? `${row.humidity}%` : "—"}
                        </TableCell>

                        {/* الحالة */}
                        <TableCell className="text-right">
                          {status === "high" ? (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0">
                              مرتفعة
                            </Badge>
                          ) : status === "low" ? (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">
                              منخفضة
                            </Badge>
                          ) : status === "normal" ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
                              طبيعية
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>

                        {/* الملاحظات */}
                        <TableCell className="text-right text-slate-600 text-sm max-w-[200px] truncate">
                          {row.message}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Empty States ── */}
      {!fetchingReport && !hasReport && device === null && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Search className="h-12 w-12 mb-4 stroke-1" />
          <p className="text-base font-medium text-slate-500">
            اختر الجهاز والفترة ثم اضغط «عرض التقرير»
          </p>
        </div>
      )}

      {!fetchingReport && device && combinedData.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Download className="h-12 w-12 mb-4 stroke-1" />
          <p className="text-base font-medium text-slate-500">
            لا توجد قراءات أو تنبيهات في الفترة المحددة
          </p>
        </div>
      )}
    </div>
  );
};

export default AuditReport;
