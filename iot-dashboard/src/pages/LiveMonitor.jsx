import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, RefreshCw, AlertCircle } from "lucide-react";
import StatusCard from "../components/StatusCard";
import apiService from "../services/api";
import { REFRESH_INTERVAL, OFFLINE_THRESHOLD } from "../config/constants";

/**
 * LiveMonitor – Command Center
 * Premium dashboard: grid of device cards, Tailwind + shadcn, no Ant Design.
 */
const LiveMonitor = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [readingsMap, setReadingsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const buildReadingPayload = (device, response) => {
    const latestReading =
      response.readings && response.readings.length > 0
        ? response.readings[0]
        : null;
    const dev = response.device || {};
    if (!latestReading) {
      return {
        device_name: dev.name || device.name || "Unknown",
        status: { is_online: false },
        last_updated: null,
      };
    }
    const now = new Date();
    const lastUpdateTime = new Date(latestReading.timestamp);
    const isOnline = now - lastUpdateTime < OFFLINE_THRESHOLD;
    return {
      device_name: dev.name || device.name,
      status: {
        temperature: latestReading.temperature,
        humidity: latestReading.humidity,
        voltage: latestReading.voltage,
        is_online: isOnline,
      },
      last_updated: latestReading.timestamp,
    };
  };

  const fetchAllReadings = useCallback(async (deviceList, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        deviceList.map((d) => apiService.getReading(d.imei))
      );
      const map = {};
      deviceList.forEach((device, i) => {
        const result = results[i];
        if (result.status === "fulfilled") {
          map[device.imei] = buildReadingPayload(device, result.value);
        } else {
          map[device.imei] = {
            device_name: device.name || "جهاز",
            status: { is_online: false },
            last_updated: null,
          };
        }
      });
      setReadingsMap(map);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Error fetching readings:", err);
      setError(err.message || "فشل في جلب البيانات");
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await apiService.getDevices();
        const deviceList = res.data || [];
        setDevices(deviceList);
        if (deviceList.length > 0) {
          await fetchAllReadings(deviceList, false);
        }
      } catch (err) {
        console.error("Error fetching devices:", err);
        setError("فشل في جلب قائمة الأجهزة");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchAllReadings]);

  useEffect(() => {
    if (devices.length === 0) return;
    const interval = setInterval(
      () => fetchAllReadings(devices, true),
      REFRESH_INTERVAL
    );
    return () => clearInterval(interval);
  }, [devices, fetchAllReadings]);

  const handleRefresh = () => {
    if (devices.length > 0) fetchAllReadings(devices, true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] gap-4" dir="rtl">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">جاري تحميل الأجهزة...</p>
      </div>
    );
  }

  return (
    <div className="live-monitor" dir="rtl">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm">
            <LayoutDashboard className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              مركز القيادة
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              المراقبة الحية للأجهزة
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-slate-500">
              آخر تحديث:{" "}
              {lastRefresh.toLocaleTimeString("ar-SA", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || devices.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            تحديث
          </button>
        </div>
      </div>

      {error && (
        <div
          className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {devices.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-12 text-center">
          <p className="text-slate-600 font-medium">لا توجد أجهزة لعرضها</p>
          <p className="text-sm text-slate-500 mt-1">
            قم بإضافة جهاز أو التحقق من الصلاحيات.
          </p>
        </div>
      ) : (
        <>
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6"
            role="list"
          >
            {devices.map((device) => {
              const data = readingsMap[device.imei];
              return (
                <div key={device.imei} role="listitem">
                  {data ? (
                    <StatusCard
                      deviceName={data.device_name}
                      temperature={data.status?.temperature}
                      humidity={data.status?.humidity}
                      voltage={data.status?.voltage}
                      batteryLevel={device.batteryLevel}
                      isOnline={data.status?.is_online}
                      isOffline={device.isOffline}
                      lastUpdated={data.last_updated}
                      onClick={() => navigate(`/device/${device.imei}`)}
                    />
                  ) : (
                    <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[280px] flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-500">
              التحديث التلقائي مفعل — يتم تحديث البيانات كل{" "}
              {REFRESH_INTERVAL / 1000} ثانية
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default LiveMonitor;
