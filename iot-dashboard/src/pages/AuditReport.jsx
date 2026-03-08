import React, { useState, useEffect } from "react";
import { Search, Download, Loader2, Printer } from "lucide-react";
import moment from "moment";
import "moment/locale/ar";
import { useTranslation } from "react-i18next";
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
 * typeReading / typeAlert are localised strings passed in.
 */
function buildCombinedRows(
  readings = [],
  alerts = [],
  typeReading = "Reading",
  typeAlert = "Alert",
) {
  const readingRows = readings.map((r) => ({
    key: `r-${r.id}`,
    timestamp: r.timestamp,
    type: typeReading,
    isAlert: false,
    temperature: r.temperature,
    humidity: r.humidity ?? "—",
    message: "—",
  }));
  const alertRows = alerts.map((a) => ({
    key: `a-${a.id}`,
    timestamp: a.timestamp,
    type: typeAlert,
    isAlert: true,
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
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const align = isRtl ? "text-right" : "text-left";

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
        setError(t("audit.error_fetch_devices"));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadReport = async () => {
    if (!selectedImei || !dateFrom || !dateTo) {
      setError(t("audit.error_no_selection"));
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
      setError(err.message || t("audit.error_fetch_report"));
      setDevice(null);
      setReadings([]);
      setAlerts([]);
    } finally {
      setFetchingReport(false);
    }
  };

  const handlePrint = () => window.print();

  const combinedData = buildCombinedRows(
    readings,
    alerts,
    t("audit.type_reading"),
    t("audit.type_alert"),
  );
  const hasReport = device && (readings.length > 0 || alerts.length > 0);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className={`${align} audit-report-page`}>
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
          {t("audit.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t("audit.subtitle")}</p>
      </header>

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Filters Card                                             */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Card className="rounded-xl border-slate-100 bg-white shadow-sm mb-6 no-print">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Filter 1: Device Select */}
            <div className="space-y-2">
              <Label>{t("audit.filter_device")}</Label>
              {loading ? (
                <div className="flex items-center gap-2 h-10 px-3 text-sm text-slate-500 border border-slate-200 rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("audit.loading")}
                </div>
              ) : (
                <Select value={selectedImei} onValueChange={setSelectedImei}>
                  <SelectTrigger className={align}>
                    <SelectValue placeholder={t("audit.select_device")} />
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
              <Label htmlFor="date-from">{t("audit.filter_from")}</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={align}
              />
            </div>

            {/* Filter 3: To Date */}
            <div className="space-y-2">
              <Label htmlFor="date-to">{t("audit.filter_to")}</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={align}
              />
            </div>

            {/* Filter 4: Action Buttons */}
            <div className="flex items-end gap-2">
              <Button onClick={loadReport} disabled={fetchingReport}>
                {fetchingReport ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {t("audit.btn_view")}
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
                disabled={!hasReport}
              >
                <Printer className="h-4 w-4" />
                {t("audit.btn_print")}
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
            {t("audit.close")}
          </button>
        </div>
      )}

      {/* ── Loading Spinner ── */}
      {fetchingReport && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <p className="text-sm">{t("audit.loading_report")}</p>
        </div>
      )}

      {/* ── Device Info Summary ── */}
      {!fetchingReport && hasReport && (
        <Card className="rounded-xl border-slate-100 bg-white shadow-sm mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900">
              {t("audit.device_info")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="font-medium text-slate-600">
                  {t("audit.field_imei")}:{" "}
                </span>
                <span className="font-mono text-slate-900" dir="ltr">
                  {device.imei}
                </span>
              </div>
              <div>
                <span className="font-medium text-slate-600">
                  {t("audit.field_name")}:{" "}
                </span>
                <span className="text-slate-900">{device.name || "—"}</span>
              </div>
              {device.minTemp != null && (
                <div>
                  <span className="font-medium text-slate-600">
                    {t("audit.field_min")}:{" "}
                  </span>
                  <span className="text-slate-900" dir="ltr">
                    {device.minTemp}°C
                  </span>
                </div>
              )}
              {device.maxTemp != null && (
                <div>
                  <span className="font-medium text-slate-600">
                    {t("audit.field_max")}:{" "}
                  </span>
                  <span className="text-slate-900" dir="ltr">
                    {device.maxTemp}°C
                  </span>
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
              {t("audit.table_title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className={`${align} font-medium text-slate-600`}>
                    {t("audit.col_datetime")}
                  </TableHead>
                  <TableHead className={`${align} font-medium text-slate-600`}>
                    {t("audit.col_type")}
                  </TableHead>
                  <TableHead className={`${align} font-medium text-slate-600`}>
                    {t("audit.col_temp")}
                  </TableHead>
                  <TableHead className={`${align} font-medium text-slate-600`}>
                    {t("audit.col_humidity")}
                  </TableHead>
                  <TableHead className={`${align} font-medium text-slate-600`}>
                    {t("audit.col_status")}
                  </TableHead>
                  <TableHead className={`${align} font-medium text-slate-600`}>
                    {t("audit.col_notes")}
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
                      {t("audit.empty_table")}
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
                        {/* Date & Time */}
                        <TableCell className={`${align} text-slate-700`}>
                          <div
                            dir="ltr"
                            className="inline-flex gap-2 items-center"
                          >
                            <span className="font-medium">
                              {moment(row.timestamp).format("YYYY-MM-DD")}
                            </span>
                            <span className="text-slate-400 text-xs">
                              {moment(row.timestamp).format("HH:mm:ss")}
                            </span>
                          </div>
                        </TableCell>

                        {/* Type */}
                        <TableCell className={align}>
                          {row.isAlert ? (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">
                              {t("audit.type_alert")}
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-0"
                            >
                              {t("audit.type_reading")}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Temperature */}
                        <TableCell
                          className={`${align} font-mono text-slate-700`}
                          dir="ltr"
                        >
                          {typeof row.temperature === "number"
                            ? `${row.temperature}°C`
                            : "—"}
                        </TableCell>

                        {/* Humidity */}
                        <TableCell
                          className={`${align} text-slate-700`}
                          dir="ltr"
                        >
                          {row.humidity !== "—" ? `${row.humidity}%` : "—"}
                        </TableCell>

                        {/* Status */}
                        <TableCell className={align}>
                          {status === "high" ? (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0">
                              {t("audit.status_high")}
                            </Badge>
                          ) : status === "low" ? (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">
                              {t("audit.status_low")}
                            </Badge>
                          ) : status === "normal" ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
                              {t("audit.status_normal")}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>

                        {/* Notes */}
                        <TableCell
                          className={`${align} text-slate-600 text-sm max-w-50 truncate`}
                        >
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
            {t("audit.empty_prompt")}
          </p>
        </div>
      )}

      {!fetchingReport && device && combinedData.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Download className="h-12 w-12 mb-4 stroke-1" />
          <p className="text-base font-medium text-slate-500">
            {t("audit.empty_no_data")}
          </p>
        </div>
      )}
    </div>
  );
};

export default AuditReport;
