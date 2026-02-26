import React, { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import api from "../services/api";

const SuperAdminDevices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAllSystemDevices();
      if (res?.data) setDevices(res.data);
      else setDevices([]);
    } catch (err) {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  return (
    <div dir="rtl" className="text-right">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            جميع الأجهزة
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            مراقبة حالة جميع الأجهزة المرتبطة بالنظام
          </p>
        </div>
      </header>

      <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">قائمة الأجهزة</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm">جاري التحميل...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-right font-medium text-slate-600">
                    الجهاز
                  </TableHead>
                  <TableHead className="text-right font-medium text-slate-600">
                    المالك
                  </TableHead>
                  <TableHead className="text-right font-medium text-slate-600">
                    الحالة
                  </TableHead>
                  <TableHead className="text-right font-medium text-slate-600">
                    البطارية
                  </TableHead>
                  <TableHead className="text-right font-medium text-slate-600">
                    نطاق الحرارة
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-12 text-slate-500"
                    >
                      لا يوجد أجهزة
                    </TableCell>
                  </TableRow>
                ) : (
                  devices.map((device) => (
                    <TableRow key={device.imei} className="border-slate-100">
                      <TableCell className="text-right">
                        <div className="font-medium text-slate-900">
                          {device.name || "جهاز غير مسمى"}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {device.imei}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-slate-700 font-medium">
                        {device.user?.username || "غير محدد"}
                      </TableCell>
                      <TableCell className="text-right">
                        {device.isOffline ? (
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-600"
                          >
                            غير متصل
                          </Badge>
                        ) : (
                          <Badge
                            variant="default"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white"
                          >
                            متصل
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-medium ${
                            (device.batteryLevel ?? 0) < 20
                              ? "text-red-600"
                              : "text-slate-700"
                          }`}
                        >
                          {device.batteryLevel ?? 0}%
                        </span>
                      </TableCell>
                      <TableCell
                        className="text-right text-slate-600"
                        dir="ltr"
                      >
                        {device.minTemp != null && device.maxTemp != null ? (
                          <div className="text-right">
                            {device.minTemp}°C - {device.maxTemp}°C
                          </div>
                        ) : (
                          <span className="text-slate-400">غير محدد</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDevices;
