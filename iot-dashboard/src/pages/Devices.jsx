import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Settings,
  Trash2,
  Loader2,
  RefreshCw,
  Plus,
  AlertTriangle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import apiService from "../services/api";
import { useTranslation } from "react-i18next";

/**
 * Devices Page — Premium shadcn/ui Table Layout
 * - Admin: View all, Add New, Assign User, Edit, Delete
 * - Client: View my devices, Add, Edit, Delete
 */
const Devices = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dialog States
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formError, setFormError] = useState("");

  // Add form state
  const [addName, setAddName] = useState("");
  const [addImei, setAddImei] = useState("");
  const [addMinTemp, setAddMinTemp] = useState("");
  const [addMaxTemp, setAddMaxTemp] = useState("");
  const [addUserId, setAddUserId] = useState(""); // admin: selected user
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editMinTemp, setEditMinTemp] = useState("");
  const [editMaxTemp, setEditMaxTemp] = useState("");

  // Delete confirmation
  const [deleteConfirmImei, setDeleteConfirmImei] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
      setError(err.message || t("devices.error_fetch_failed"));
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
    setAddUserId("");
  };

  const openAddDialog = async () => {
    setOpenAdd(true);
    if (isAdmin && usersList.length === 0) {
      try {
        setUsersLoading(true);
        const res = await apiService.getUsers();
        setUsersList(res.data || res.users || []);
      } catch (err) {
        console.warn("Could not load users list:", err.message);
      } finally {
        setUsersLoading(false);
      }
    }
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!addImei.trim()) {
      setFormError(t("devices.error_imei_required"));
      return;
    }
    try {
      setSubmitLoading(true);
      const payload = {
        name: addName.trim() || undefined,
        imei: addImei.trim(),
        minTemp: addMinTemp !== "" ? Number(addMinTemp) : undefined,
        maxTemp: addMaxTemp !== "" ? Number(addMaxTemp) : undefined,
      };
      if (isAdmin && addUserId !== "") {
        payload.userId = Number(addUserId);
      }
      if (isAdmin) {
        await apiService.createDevice(payload);
      } else {
        await apiService.addMyDevice(payload);
      }
      closeAddDialog();
      await fetchDevices();
    } catch (err) {
      setFormError(err.message || t("devices.error_add_failed"));
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
      setFormError(err.message || t("devices.error_update_failed"));
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── Delete Device ───
  const handleDeleteDevice = async () => {
    if (!deleteConfirmImei) return;
    try {
      setDeleteLoading(true);
      if (isAdmin) {
        await apiService.deleteDevice(deleteConfirmImei);
      } else {
        await apiService.deleteMyDevice(deleteConfirmImei);
      }
      setDeleteConfirmImei(null);
      await fetchDevices();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={isRtl ? "text-right" : "text-left"}
    >
      {/* ── Header ── */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isAdmin ? t("devices.title_admin") : t("devices.title_client")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("devices.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDevices}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t("common.refresh")}
          </Button>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4" />
            {t("devices.add_btn")}
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
          <CardTitle className="text-slate-900">
            {t("devices.list_title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm">{t("common.loading")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead
                    className={`${isRtl ? "text-right" : "text-left"} font-medium text-slate-600`}
                  >
                    {t("devices.col_device")}
                  </TableHead>
                  <TableHead
                    className={`${isRtl ? "text-right" : "text-left"} font-medium text-slate-600`}
                  >
                    {t("devices.col_status")}
                  </TableHead>
                  <TableHead
                    className={`${isRtl ? "text-right" : "text-left"} font-medium text-slate-600`}
                  >
                    {t("devices.col_battery")}
                  </TableHead>
                  <TableHead
                    className={`${isRtl ? "text-right" : "text-left"} font-medium text-slate-600`}
                  >
                    {t("devices.col_temp_range")}
                  </TableHead>
                  {isAdmin && (
                    <TableHead
                      className={`${isRtl ? "text-right" : "text-left"} font-medium text-slate-600`}
                    >
                      {t("devices.col_owner")}
                    </TableHead>
                  )}
                  <TableHead className="text-center font-medium text-slate-600">
                    {t("devices.col_actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 6 : 5}
                      className="text-center py-12 text-slate-500"
                    >
                      {t("devices.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  devices.map((device) => (
                    <TableRow key={device.imei} className="border-slate-100">
                      {/* ── الجهاز (Name + IMEI) ── */}
                      <TableCell className={isRtl ? "text-right" : "text-left"}>
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
                      <TableCell className={isRtl ? "text-right" : "text-left"}>
                        {!device.isOffline ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
                            {t("status.connected")}
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-0"
                          >
                            {t("status.offline")}
                          </Badge>
                        )}
                      </TableCell>

                      {/* ── البطارية ── */}
                      <TableCell className={isRtl ? "text-right" : "text-left"}>
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
                      <TableCell
                        className={`${isRtl ? "text-right" : "text-left"} text-slate-700`}
                      >
                        {device.minTemp != null && device.maxTemp != null ? (
                          <span className="font-mono text-sm" dir="ltr">
                            {device.minTemp}°C – {device.maxTemp}°C
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            {t("status.not_set")}
                          </span>
                        )}
                      </TableCell>

                      {/* ── المالك (Admin only) ── */}
                      {isAdmin && (
                        <TableCell
                          className={`${isRtl ? "text-right" : "text-left"} text-slate-600 text-sm`}
                        >
                          {device.assignedTo || t("status.unassigned")}
                        </TableCell>
                      )}

                      {/* ── الإجراءات ── */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("devices.edit_title")}
                            onClick={() => openEditDialog(device)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("common.delete")}
                            onClick={() => setDeleteConfirmImei(device.imei)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
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
        <DialogContent
          className="sm:max-w-md text-start"
         
        >
          <DialogHeader>
            <DialogTitle>
              {isAdmin
                ? t("devices.add_title_admin")
                : t("devices.add_title_client")}
            </DialogTitle>
            <DialogDescription>{t("devices.add_desc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDevice} className="space-y-4">
            {formError && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
                {formError}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="add-name">{t("devices.label_name")}</Label>
              <Input
                id="add-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder={t("devices.placeholder_name")}
                className={isRtl ? "text-right" : "text-left"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-imei">{t("devices.label_imei")} *</Label>
              <Input
                id="add-imei"
                value={addImei}
                onChange={(e) => setAddImei(e.target.value)}
                placeholder={t("devices.placeholder_imei")}
                className={isRtl ? "text-right" : "text-left"}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-min">{t("devices.label_min")}</Label>
                <Input
                  id="add-min"
                  type="number"
                  value={addMinTemp}
                  onChange={(e) => setAddMinTemp(e.target.value)}
                  placeholder="2"
                  className={isRtl ? "text-right" : "text-left"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-max">{t("devices.label_max")}</Label>
                <Input
                  id="add-max"
                  type="number"
                  value={addMaxTemp}
                  onChange={(e) => setAddMaxTemp(e.target.value)}
                  placeholder="8"
                  className={isRtl ? "text-right" : "text-left"}
                />
              </div>
            </div>
            {/* Admin-only: assign to a user */}
            {isAdmin && (
              <div className="space-y-2">
                <Label>{t("devices.label_assign")}</Label>
                {usersLoading ? (
                  <p className="text-xs text-slate-500">
                    {t("devices.loading_users")}
                  </p>
                ) : (
                  <Select
                    value={addUserId}
                    onValueChange={(val) =>
                      setAddUserId(val === "__none__" ? "" : val)
                    }
                    dir={isRtl ? "rtl" : "ltr"}
                  >
                    <SelectTrigger
                      className={`w-full ${isRtl ? "text-right" : "text-left"}`}
                    >
                      <SelectValue placeholder={t("devices.no_user")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        {t("devices.no_user")}
                      </SelectItem>
                      {usersList.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeAddDialog}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={submitLoading}>
                {submitLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("common.add")}
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
        <DialogContent
          className="sm:max-w-md text-right"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle>{t("devices.edit_title")}</DialogTitle>
            <DialogDescription>
              {editingDevice && (
                <span className="text-slate-600">
                  {editingDevice.name || editingDevice.imei}
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
              <Label htmlFor="edit-name">{t("devices.label_name")}</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t("devices.label_name")}
                className={isRtl ? "text-right" : "text-left"}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-min">{t("devices.label_min")}</Label>
                <Input
                  id="edit-min"
                  type="number"
                  value={editMinTemp}
                  onChange={(e) => setEditMinTemp(e.target.value)}
                  placeholder={t("devices.placeholder_leave_empty")}
                  className={isRtl ? "text-right" : "text-left"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max">{t("devices.label_max")}</Label>
                <Input
                  id="edit-max"
                  type="number"
                  value={editMaxTemp}
                  onChange={(e) => setEditMaxTemp(e.target.value)}
                  placeholder={t("devices.placeholder_leave_empty")}
                  className={isRtl ? "text-right" : "text-left"}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeEditDialog}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={submitLoading}>
                {submitLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Delete Confirmation Dialog                               */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Dialog
        open={!!deleteConfirmImei}
        onOpenChange={(open) => !open && setDeleteConfirmImei(null)}
      >
        <DialogContent
          className="sm:max-w-sm text-right"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t("devices.delete_title")}
            </DialogTitle>
            <DialogDescription>
              {t("devices.delete_desc")} <strong>{deleteConfirmImei}</strong>?{" "}
              {t("common.cant_undo")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmImei(null)}
              disabled={deleteLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDevice}
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Devices;
