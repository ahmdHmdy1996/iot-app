import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Loader2, Search, Building2, Thermometer,
  Wifi, WifiOff, RefreshCw, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import api from "../services/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(raw) {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleString("ar-SA", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch { return raw; }
}

function timeAgo(raw) {
  if (!raw) return null;
  const diff = Date.now() - new Date(raw).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `منذ ${hrs} س`;
  return `منذ ${Math.floor(hrs / 24)} يوم`;
}

// ── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({ label, value, icon: Icon, colorCls, bgCls }) {
  return (
    <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex items-center justify-center rounded-xl p-3 ${bgCls}`}>
          <Icon className={`h-5 w-5 ${colorCls}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Alert badge ───────────────────────────────────────────────────────────────

const ALERT_LABELS = {
  NORMAL:           { label: "طبيعي",        cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  TEMPERATURE_HIGH: { label: "حرارة مرتفعة", cls: "bg-red-50    text-red-700    border-red-200"     },
  TEMPERATURE_LOW:  { label: "حرارة منخفضة", cls: "bg-sky-50    text-sky-700    border-sky-200"     },
};

// ── Main page ─────────────────────────────────────────────────────────────────

const CaterflowDevices = () => {
  const [devices, setDevices]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCaterflowDevices();
      setDevices(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch CaterFlow devices:", err);
      setError("تعذّر تحميل الأجهزة. يرجى المحاولة مجدداً.");
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const restaurants = new Set(
      devices.map(d => d.caterflowRestaurantId).filter(Boolean),
    );
    return {
      total:       devices.length,
      restaurants: restaurants.size,
      active:      devices.filter(d => d.isActive && !d.isOffline).length,
      offline:     devices.filter(d => d.isOffline).length,
    };
  }, [devices]);

  // ── Client-side search ────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter(d =>
      (d.name  || "").toLowerCase().includes(q) ||
      (d.imei  || "").toLowerCase().includes(q) ||
      (d.caterflowRestaurantId || "").toLowerCase().includes(q) ||
      (d.externalRefId         || "").toLowerCase().includes(q),
    );
  }, [devices, search]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="text-right space-y-6">

      {/* ── Page header ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl bg-orange-50 p-2.5 border border-orange-100">
            <Building2 className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              أجهزة CaterFlow
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              جميع الأجهزة المرتبطة بمنصة CaterFlow عبر واجهة B2B
            </p>
          </div>
        </div>

        <button
          onClick={fetchDevices}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </header>

      {/* ── Summary stat tiles ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="إجمالي الأجهزة"
          value={stats.total}
          icon={Building2}
          colorCls="text-blue-600"
          bgCls="bg-blue-50"
        />
        <StatTile
          label="مطاعم مرتبطة"
          value={stats.restaurants}
          icon={Building2}
          colorCls="text-orange-500"
          bgCls="bg-orange-50"
        />
        <StatTile
          label="أجهزة نشطة"
          value={stats.active}
          icon={Wifi}
          colorCls="text-emerald-600"
          bgCls="bg-emerald-50"
        />
        <StatTile
          label="أجهزة غير متصلة"
          value={stats.offline}
          icon={WifiOff}
          colorCls="text-red-500"
          bgCls="bg-red-50"
        />
      </div>

      {/* ── Search bar ── */}
      <div className="relative">
        <Search className="absolute top-1/2 right-3 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث بالاسم، IMEI، أو رقم المطعم..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pr-10 pl-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
          dir="rtl"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Data table card ── */}
      <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-slate-900 text-base">
            قائمة الأجهزة
            {!loading && (
              <span className="mr-2 text-sm font-normal text-slate-400">
                ({filtered.length} من {devices.length})
              </span>
            )}
          </CardTitle>
          {/* Orange B2B badge */}
          <Badge
            variant="outline"
            className="border-orange-200 bg-orange-50 text-orange-600 text-xs font-medium"
          >
            B2B · CaterFlow
          </Badge>
        </CardHeader>

        <CardContent className="p-0">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue-500" />
              <p className="text-sm">جاري التحميل...</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle className="h-8 w-8 text-red-400" />
              <p className="text-sm text-slate-500">{error}</p>
              <button
                onClick={fetchDevices}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Building2 className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">
                {search ? "لا توجد نتائج للبحث." : "لا توجد أجهزة CaterFlow مسجّلة بعد."}
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && filtered.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50/60">
                  <TableHead className="text-right font-semibold text-slate-600 py-3 pr-6">
                    الجهاز
                  </TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">
                    المطعم
                  </TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">
                    نطاق الحرارة
                  </TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">
                    آخر قراءة
                  </TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">
                    الحالة
                  </TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">
                    تاريخ التسجيل
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((device, idx) => {
                  const alertMeta = ALERT_LABELS[device.lastAlertStatus] ?? ALERT_LABELS.NORMAL;
                  const isOffline = device.isOffline;
                  const ago       = timeAgo(device.lastOnline);

                  return (
                    <TableRow
                      key={device.imei}
                      className={`border-slate-50 transition-colors ${idx % 2 === 0 ? "" : "bg-slate-50/30"} hover:bg-blue-50/30`}
                    >
                      {/* Device name + IMEI */}
                      <TableCell className="text-right pr-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${isOffline ? "bg-slate-300" : "bg-emerald-400"}`} />
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">
                              {device.name || "جهاز غير مسمى"}
                            </p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              {device.imei}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Restaurant ID */}
                      <TableCell className="text-right">
                        {device.caterflowRestaurantId ? (
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="outline"
                              className="border-orange-200 bg-orange-50 text-orange-700 font-mono text-xs w-fit"
                            >
                              {device.caterflowRestaurantId}
                            </Badge>
                            {device.externalRefId && device.externalRefId !== device.caterflowRestaurantId && (
                              <span className="text-xs text-slate-400 font-mono">
                                ref: {device.externalRefId}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Temp range */}
                      <TableCell className="text-right" dir="ltr">
                        {device.minTemp != null || device.maxTemp != null ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Thermometer className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-sm text-slate-700 font-medium">
                              {device.minTemp ?? "—"}°
                              {" – "}
                              {device.maxTemp ?? "—"}°C
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">غير محدد</span>
                        )}
                      </TableCell>

                      {/* Latest reading */}
                      <TableCell className="text-right">
                        {device.latestTemp != null ? (
                          <div>
                            <span className={`font-semibold text-sm ${device.lastAlertStatus !== "NORMAL" ? "text-red-600" : "text-slate-800"}`}>
                              {Number(device.latestTemp).toFixed(1)}°C
                            </span>
                            {ago && (
                              <p className="text-xs text-slate-400 mt-0.5">{ago}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">لا توجد قراءات</span>
                        )}
                      </TableCell>

                      {/* Status badges */}
                      <TableCell className="text-right">
                        <div className="flex flex-col gap-1.5 items-end">
                          {/* Online / Offline */}
                          {isOffline ? (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-xs w-fit">
                              غير متصل
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-xs w-fit">
                              متصل
                            </Badge>
                          )}
                          {/* Alert status — only shown when not normal */}
                          {device.lastAlertStatus && device.lastAlertStatus !== "NORMAL" && (
                            <Badge
                              variant="outline"
                              className={`text-xs w-fit border ${alertMeta.cls}`}
                            >
                              {alertMeta.label}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Registration date */}
                      <TableCell className="text-right text-xs text-slate-500">
                        {formatDate(device.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CaterflowDevices;
