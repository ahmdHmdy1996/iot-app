import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Battery, Droplets, Zap } from "lucide-react";
import { TEMP_CRITICAL_THRESHOLD } from "../config/constants";
import { useTranslation } from "react-i18next";

const TEMP_COLD_THRESHOLD = 2; // °C – below this show "too cold" blue

/**
 * StatusCard – Premium device card with shadcn Card, Tailwind, lucide icons.
 * Chic, colorful, animated; RTL-friendly.
 */
const StatusCard = ({
  deviceName,
  temperature,
  humidity,
  voltage,
  batteryLevel,
  isOnline,
  isOffline,
  lastUpdated,
  onClick,
}) => {
  const { t, i18n } = useTranslation();
  const timeLang = i18n.language === "ar" ? "ar-SA" : "en-US";
  const isRtl = i18n.language === "ar";

  const offline = isOffline === true || !isOnline;

  const hasCriticalAlert =
    !offline &&
    temperature != null &&
    (temperature >= TEMP_CRITICAL_THRESHOLD ||
      temperature <= TEMP_COLD_THRESHOLD);

  const getTempColor = () => {
    if (offline) return "text-slate-400";
    if (temperature == null) return "text-slate-800";
    if (temperature >= TEMP_CRITICAL_THRESHOLD) return "text-rose-500";
    if (temperature <= TEMP_COLD_THRESHOLD) return "text-blue-500";
    return "text-slate-800";
  };

  const tempDisplay =
    temperature != null ? Number(temperature).toFixed(1) : "—";

  return (
    <Card
      className="relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer h-full flex flex-col"
      onClick={onClick}
    >
      {/* Header */}
      <CardHeader className="flex flex-row justify-between items-center p-5 border-b border-slate-50/50 space-y-0">
        <span
          className="font-semibold text-slate-800"
          dir={isRtl ? "rtl" : "ltr"}
        >
          {deviceName || t("card.unnamed")}
        </span>
        {!offline ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            {t("card.connected")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            {t("card.offline")}
          </span>
        )}
      </CardHeader>

      {/* Main body – temperature */}
      <CardContent className="p-6 pt-6 pb-4 flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <div
            className={`text-6xl font-black tracking-tighter ${getTempColor()}`}
            dir="rtl"
          >
            {tempDisplay}
            <span className="text-4xl font-bold opacity-80">°C</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">{t("card.temperature")}</p>
          {hasCriticalAlert && (
            <span className="mt-3 bg-rose-50 text-rose-600 px-4 py-1.5 rounded-full text-sm font-medium animate-pulse">
              {temperature >= TEMP_CRITICAL_THRESHOLD
                ? t("card.alert_high")
                : t("card.alert_low")}
            </span>
          )}
        </div>
      </CardContent>

      {/* Footer – minor stats */}
      <div className="flex justify-between items-center bg-slate-50 p-4 m-2 rounded-xl">
        <div className="flex flex-col items-center gap-0.5 min-w-0 flex-1">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 p-1.5">
            <Droplets className="w-4 h-4" />
          </span>
          <span className="text-xs text-slate-500">{t("card.humidity")}</span>
          <span className="text-sm font-semibold text-slate-800">
            {humidity != null ? `${humidity}%` : "—"}
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5 min-w-0 flex-1">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600 p-1.5">
            <Battery className="w-4 h-4" />
          </span>
          <span className="text-xs text-slate-500">{t("card.battery")}</span>
          <span className="text-sm font-semibold text-slate-800">
            {batteryLevel != null
              ? `${Number(batteryLevel)}%`
              : voltage != null
                ? `${voltage}V`
                : "—"}
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5 min-w-0 flex-1">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-600 p-1.5">
            <Zap className="w-4 h-4" />
          </span>
          <span className="text-xs text-slate-500">{t("card.power")}</span>
          <span className="text-sm font-semibold text-slate-800">
            {voltage != null ? `${voltage}V` : "—"}
          </span>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-xs text-slate-400 text-center pb-3">
          {t("card.last_updated")}{" "}
          {new Date(lastUpdated).toLocaleTimeString(timeLang, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </Card>
  );
};

export default StatusCard;
