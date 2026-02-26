import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Settings,
  Trash2,
  Loader2,
  RefreshCw,
  Plus,
  UserPlus,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import apiService from "../services/api";

/**
 * Devices Page — Premium shadcn/ui Table Layout
 * - Admin: View all, Add New, Assign User, Edit, Delete
 * - Client: View my devices, Add, Edit, Delete
 */
const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dialog States
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formError, setFormError] = useState("");

  // Add form state
  const [addName, setAddName] = useState("");
  const [addImei, setAddImei] = useState("");
  const [addMinTemp, setAddMinTemp] = useState("");
  const [addMaxTemp, setAddMaxTemp] = useState("");
  const [addCalibration, setAddCalibration] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editMinTemp, setEditMinTemp] = useState("");
  const [editMaxTemp, setEditMaxTemp] = useState("");

  // Assign form state (Admin)
  const [assignImei, setAssignImei] = useState("");
  const [assignUserId, setAssignUserId] = useState("");

  // Get User Role
  const userStr = localStorage.getItem("user");
  let role = "CLIENT";
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      role = u.role || "CLIENT";
    } catch (e) {
      /* ignore */
    }
  }
  const isAdmin = role === "ADMIN";

  /**
   * Fetch devices list
   */
  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiService.getDevices();
      setDevices(response.data || []);
    } catch (err) {
      console.error("Error fetching devices:", err);
      setError(err.message || "فشل في جلب قائمة الأجهزة");
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // ─── Add Device ───
  const closeAddDialog = () => {
    setOpenAdd(false);
    setFormError("");
    setAddName("");
    setAddImei("");
    setAddMinTemp("");
    setAddMaxTemp("");
    setAddCalibration("");
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!addImei.trim()) {
      setFormError("IMEI مطلوب");
      return;
    }
    try {
      setSubmitLoading(true);
      const payload = {
        name: addName.trim() || undefined,
        imei: addImei.trim(),
        minTemp: addMinTemp !== "" ? Number(addMinTemp) : undefined,
        maxTemp: addMaxTemp !== "" ? Number(addMaxTemp) : undefined,
        calibrationOffset:
          addCalibration !== "" ? Number(addCalibration) : undefined,
      };
      if (isAdmin) {
        await apiService.createDevice(payload);
      } else {
        await apiService.addMyDevice(payload);
      }
      closeAddDialog();
      await fetchDevices();
    } catch (err) {
      setFormError(err.message || "فشل في إضافة الجهاز");
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── Edit Device ───
  const openEditDialog = (device) => {
    setFormError("");
    setEditingDevice(device);
    setEditName(device.name ?? "");
    setEditMinTemp(device.minTemp != null ? String(device.minTemp) : "");
    setEditMaxTemp(device.maxTemp != null ? String(device.maxTemp) : "");
    setOpenEdit(true);
  };

  const closeEditDialog = () => {
    setOpenEdit(false);
    setEditingDevice(null);
    setFormError("");
  };

  const handleEditDevice = async (e) => {
    e.preventDefault();
    if (!editingDevice?.imei) return;
    setFormError("");
    try {
      setSubmitLoading(true);
      const payload = {
        name: editName.trim() || null,
        minTemp: editMinTemp !== "" ? Number(editMinTemp) : null,
        maxTemp: editMaxTemp !== "" ? Number(editMaxTemp) : null,
      };
      if (isAdmin) {
        await apiService.updateDevice(editingDevice.imei, payload);
      } else {
        await apiService.updateMyDevice(editingDevice.imei, payload);
      }
      closeEditDialog();
      await fetchDevices();
    } catch (err) {
      setFormError(err.message || "فشل في تحديث الجهاز");
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── Delete Device ───
  const handleDeleteDevice = async (imei) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الجهاز؟")) return;
    try {
      if (isAdmin) {
        await apiService.deleteDevice(imei);
      } else {
        await apiService.deleteMyDevice(imei);
      }
      await fetchDevices();
    } catch (err) {
      console.error(err);
      alert(err.message || "فشل في حذف الجهاز");
    }
  };

  // ─── Assign Device (Admin) ───
  const closeAssignDialog = () => {
    setOpenAssign(false);
    setFormError("");
    setAssignImei("");
    setAssignUserId("");
  };

  const handleAssignDevice = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!assignImei.trim() || !assignUserId.trim()) {
      setFormError("IMEI ومعرف المستخدم مطلوبان");
      return;
    }
    try {
      setSubmitLoading(true);
      await apiService.assignDevice({
        imei: assignImei.trim(),
        userId: assignUserId.trim(),
      });
      closeAssignDialog();
      await fetchDevices();
    } catch (err) {
      setFormError(err.message || "فشل في تخصيص الجهاز");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div dir="rtl" className="text-right">
      {/* ── Header ── */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isAdmin ? "إدارة المخزون والأجهزة" : "إدارة أجهزتي"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            التحكم في إعدادات ونطاقات الحرارة لأجهزتك
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDevices}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <RefreshCw className="h-4 w-4 ml-2" />
            )}
            تحديث
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenAssign(true)}
            >
              <UserPlus className="h-4 w-4 ml-2" />
              تخصيص مستخدم
            </Button>
          )}
          <Button size="sm" onClick={() => setOpenAdd(true)}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة جهاز
          </Button>
        </div>
      </header>

      {/* ── Error Banner ── */}
      {error && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      {/* ── Devices Table ── */}
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
                    الحالة
                  </TableHead>
                  <TableHead className="text-right font-medium text-slate-600">
                    البطارية
                  </TableHead>
                  <TableHead className="text-right font-medium text-slate-600">
                    نطاق الحرارة
                  </TableHead>
                  <TableHead className="text-right font-medium text-slate-600">
                    الإجراءات
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
                      لا توجد أجهزة لعرضها
                    </TableCell>
                  </TableRow>
                ) : (
                  devices.map((device) => (
                    <TableRow key={device.imei} className="border-slate-100">
                      {/* ── الجهاز (Name + IMEI) ── */}
                      <TableCell className="text-right">
                        <div>
                          <Link
                            to={`/device/${device.imei}`}
                            className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                          >
                            {device.name || "—"}
                          </Link>
                          <p className="text-xs text-slate-500 mt-0.5 font-mono">
                            {device.imei}
                          </p>
                        </div>
                      </TableCell>

                      {/* ── الحالة ── */}
                      <TableCell className="text-right">
                        {!device.isOffline ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
                            متصل
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-0"
                          >
                            غير متصل
                          </Badge>
                        )}
                      </TableCell>

                      {/* ── البطارية ── */}
                      <TableCell className="text-right">
                        {device.batteryLevel != null ? (
                          <span
                            className={`font-medium ${
                              device.batteryLevel < 20
                                ? "text-red-500"
                                : "text-slate-700"
                            }`}
                          >
                            {device.batteryLevel}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>

                      {/* ── نطاق الحرارة ── */}
                      <TableCell className="text-right text-slate-700">
                        {device.minTemp != null && device.maxTemp != null ? (
                          <span className="font-mono text-sm">
                            {device.minTemp}°C – {device.maxTemp}°C
                          </span>
                        ) : (
                          <span className="text-slate-400">غير محدد</span>
                        )}
                      </TableCell>

                      {/* ── الإجراءات ── */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="تعديل الإعدادات"
                            onClick={() => openEditDialog(device)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="حذف"
                            onClick={() => handleDeleteDevice(device.imei)}
                          >
                            <Trash2 className="h-4 w-4 text-slate-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Add Device Dialog                                        */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Dialog open={openAdd} onOpenChange={(open) => !open && closeAddDialog()}>
        <DialogContent className="sm:max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {isAdmin ? "إضافة جهاز جديد للمخزون" : "إضافة جهاز جديد"}
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات الجهاز الجديد بما في ذلك IMEI ونطاق الحرارة
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDevice} className="space-y-4">
            {formError && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
                {formError}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="add-name">اسم الجهاز</Label>
              <Input
                id="add-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="ثلاجة المطبخ"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-imei">IMEI *</Label>
              <Input
                id="add-imei"
                value={addImei}
                onChange={(e) => setAddImei(e.target.value)}
                placeholder="رقم الجهاز IMEI"
                className="text-right"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-min">الحد الأدنى (°C)</Label>
                <Input
                  id="add-min"
                  type="number"
                  value={addMinTemp}
                  onChange={(e) => setAddMinTemp(e.target.value)}
                  placeholder="2"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-max">الحد الأقصى (°C)</Label>
                <Input
                  id="add-max"
                  type="number"
                  value={addMaxTemp}
                  onChange={(e) => setAddMaxTemp(e.target.value)}
                  placeholder="8"
                  className="text-right"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-cal">معامل المعايرة</Label>
              <Input
                id="add-cal"
                type="number"
                step="0.1"
                value={addCalibration}
                onChange={(e) => setAddCalibration(e.target.value)}
                placeholder="0"
                className="text-right"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeAddDialog}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitLoading}>
                {submitLoading && (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                )}
                إضافة
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Edit Device Dialog                                       */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Dialog
        open={openEdit}
        onOpenChange={(open) => !open && closeEditDialog()}
      >
        <DialogContent className="sm:max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle>إعدادات الجهاز</DialogTitle>
            <DialogDescription>
              {editingDevice && (
                <span className="text-slate-600">
                  تعديل: {editingDevice.name || editingDevice.imei}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditDevice} className="space-y-4">
            {formError && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
                {formError}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-name">اسم الجهاز</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="اسم الجهاز"
                className="text-right"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-min">الحد الأدنى (°C)</Label>
                <Input
                  id="edit-min"
                  type="number"
                  value={editMinTemp}
                  onChange={(e) => setEditMinTemp(e.target.value)}
                  placeholder="اتركه فارغاً لإلغاء"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max">الحد الأقصى (°C)</Label>
                <Input
                  id="edit-max"
                  type="number"
                  value={editMaxTemp}
                  onChange={(e) => setEditMaxTemp(e.target.value)}
                  placeholder="اتركه فارغاً لإلغاء"
                  className="text-right"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeEditDialog}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitLoading}>
                {submitLoading && (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                )}
                حفظ التغييرات
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Assign Device Dialog (Admin Only)                        */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Dialog
        open={openAssign}
        onOpenChange={(open) => !open && closeAssignDialog()}
      >
        <DialogContent className="sm:max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle>تخصيص جهاز لمستخدم</DialogTitle>
            <DialogDescription>
              أدخل IMEI الجهاز ومعرف المستخدم لتخصيص الجهاز
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignDevice} className="space-y-4">
            {formError && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
                {formError}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="assign-imei">IMEI الجهاز</Label>
              <Input
                id="assign-imei"
                value={assignImei}
                onChange={(e) => setAssignImei(e.target.value)}
                placeholder="ادخل IMEI"
                className="text-right"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-user">معرف المستخدم (ID)</Label>
              <Input
                id="assign-user"
                type="number"
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                placeholder="ID المستخدم"
                className="text-right"
                required
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={closeAssignDialog}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={submitLoading}>
                {submitLoading && (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                )}
                تخصيص
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Devices;
