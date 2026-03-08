import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  RefreshCw,
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
import api from "../services/api";
import { useTranslation } from "react-i18next";

const UserManagement = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const dateLang = i18n.language === "ar" ? "ar-EG" : "en-US";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add User dialog
  const [openAdd, setOpenAdd] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState("CLIENT");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit Plan dialog
  const [openEditPlan, setOpenEditPlan] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editPlan, setEditPlan] = useState("BASIC");
  const [editMaxDevices, setEditMaxDevices] = useState("");
  const [editPlanLoading, setEditPlanLoading] = useState(false);
  const [editPlanError, setEditPlanError] = useState("");

  // Delete confirmation dialog
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getUsers();
      if (Array.isArray(result)) {
        setUsers(result);
      } else if (result?.data && Array.isArray(result.data)) {
        setUsers(result.data);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ─── Add User ───
  const closeAddDialog = () => {
    setOpenAdd(false);
    setAddError("");
    setAddUsername("");
    setAddPassword("");
    setAddRole("CLIENT");
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddError("");
    if (!addUsername.trim() || !addPassword.trim()) {
      setAddError("اسم المستخدم وكلمة المرور مطلوبان");
      return;
    }
    try {
      setAddLoading(true);
      await api.createUser({
        username: addUsername.trim(),
        password: addPassword.trim(),
        role: addRole,
      });
      closeAddDialog();
      await fetchUsers();
    } catch (err) {
      setAddError(err.message || "فشل إنشاء المستخدم");
    } finally {
      setAddLoading(false);
    }
  };

  // ─── Edit Plan ───
  const openEditPlanDialog = (user) => {
    setEditingUser(user);
    setEditPlan(user.plan || "BASIC");
    setEditMaxDevices(String(user.maxDevices ?? 5));
    setEditPlanError("");
    setOpenEditPlan(true);
  };

  const closeEditPlanDialog = () => {
    setOpenEditPlan(false);
    setEditingUser(null);
    setEditPlanError("");
  };

  const handleEditPlan = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditPlanError("");
    const maxDev = Number(editMaxDevices);
    if (!editMaxDevices || isNaN(maxDev) || maxDev < 1) {
      setEditPlanError("أقصى عدد أجهزة يجب أن يكون 1 على الأقل");
      return;
    }
    try {
      setEditPlanLoading(true);
      await api.updateUserPlan(editingUser.id, {
        plan: editPlan,
        maxDevices: maxDev,
      });
      closeEditPlanDialog();
      await fetchUsers();
    } catch (err) {
      setEditPlanError(err.message || "فشل تحديث الباقة");
    } finally {
      setEditPlanLoading(false);
    }
  };

  // ─── Delete User ───
  const handleDeleteUser = async () => {
    if (!deleteConfirmId) return;
    try {
      setDeleteLoading(true);
      await api.deleteAdminUser(deleteConfirmId);
      setDeleteConfirmId(null);
      await fetchUsers();
    } catch (err) {
      console.error("Delete user failed:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const deleteTargetUser = users.find((u) => u.id === deleteConfirmId);

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={isRtl ? "text-right" : "text-left"}
    >
      {/* ── Header ── */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t("users.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("users.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t("common.refresh")}
          </Button>
          <Button size="sm" onClick={() => setOpenAdd(true)}>
            <Plus className="h-4 w-4" />
            {t("users.add_btn")}
          </Button>
        </div>
      </header>

      {/* ── Users Table ── */}
      <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">
            {t("users.list_title")}
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
                    {t("users.col_user")}
                  </TableHead>
                  <TableHead
                    className={`${isRtl ? "text-right" : "text-left"} font-medium text-slate-600`}
                  >
                    {t("users.col_role")}
                  </TableHead>
                  <TableHead
                    className={`${isRtl ? "text-right" : "text-left"} font-medium text-slate-600`}
                  >
                    {t("users.col_plan")}
                  </TableHead>
                  <TableHead
                    className={`${isRtl ? "text-right" : "text-left"} font-medium text-slate-600`}
                  >
                    {t("users.col_devices")}
                  </TableHead>
                  <TableHead
                    className={`${isRtl ? "text-right" : "text-left"} font-medium text-slate-600`}
                  >
                    {t("users.col_created")}
                  </TableHead>
                  <TableHead className="text-center font-medium text-slate-600">
                    {t("users.col_actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-slate-500"
                    >
                      {t("users.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="border-slate-100">
                      {/* ── المستخدم ── */}
                      <TableCell className={isRtl ? "text-right" : "text-left"}>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {user.username}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            #{user.id}
                          </p>
                        </div>
                      </TableCell>

                      {/* ── الدور ── */}
                      <TableCell className={isRtl ? "text-right" : "text-left"}>
                        {user.role === "ADMIN" ? (
                          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0">
                            {t("roles.ADMIN")}
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">
                            {t("roles.CLIENT")}
                          </Badge>
                        )}
                      </TableCell>

                      {/* ── الباقة ── */}
                      <TableCell className={isRtl ? "text-right" : "text-left"}>
                        <div>
                          <p className="font-medium text-slate-800">
                            {t("plans." + (user.plan || "BASIC"))}
                          </p>
                          <p className="text-xs text-slate-500">
                            {user.deviceCount ?? 0} / {user.maxDevices ?? 5}{" "}
                            {t("users.devices_count")}
                          </p>
                        </div>
                      </TableCell>

                      {/* ── الأجهزة ── */}
                      <TableCell
                        className={`${isRtl ? "text-right" : "text-left"} text-slate-700`}
                      >
                        {user.deviceCount ?? 0}
                      </TableCell>

                      {/* ── تاريخ الإنشاء ── */}
                      <TableCell
                        className={`${isRtl ? "text-right" : "text-left"} text-slate-500 text-sm`}
                      >
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString(
                              dateLang,
                            )
                          : "—"}
                      </TableCell>

                      {/* ── الإجراءات ── */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("users.edit_plan_title")}
                            onClick={() => openEditPlanDialog(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("common.delete")}
                            onClick={() => setDeleteConfirmId(user.id)}
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
      {/*  Add User Dialog                                          */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Dialog open={openAdd} onOpenChange={(open) => !open && closeAddDialog()}>
        <DialogContent
          className="sm:max-w-md text-right"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle>{t("users.add_title")}</DialogTitle>
            <DialogDescription>{t("users.add_desc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            {addError && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
                {addError}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="add-username">{t("users.label_username")}</Label>
              <Input
                id="add-username"
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                placeholder={t("users.label_username")}
                className={isRtl ? "text-right" : "text-left"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">{t("users.label_password")}</Label>
              <Input
                id="add-password"
                type="password"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                placeholder={t("users.label_password")}
                className={isRtl ? "text-right" : "text-left"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("users.label_role")}</Label>
              <Select
                value={addRole}
                onValueChange={setAddRole}
                dir={isRtl ? "rtl" : "ltr"}
              >
                <SelectTrigger
                  className={`w-full ${isRtl ? "text-right" : "text-left"}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT">
                    {t("users.option_client")}
                  </SelectItem>
                  <SelectItem value="ADMIN">
                    {t("users.option_admin")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeAddDialog}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={addLoading}>
                {addLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("common.add")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Edit Plan Dialog                                         */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Dialog
        open={openEditPlan}
        onOpenChange={(open) => !open && closeEditPlanDialog()}
      >
        <DialogContent
          className="sm:max-w-md text-right"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle>{t("users.edit_plan_title")}</DialogTitle>
            <DialogDescription>
              {editingUser && (
                <span>
                  {t("users.edit_plan_desc")} {editingUser.username}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditPlan} className="space-y-4">
            {editPlanError && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
                {editPlanError}
              </p>
            )}
            <div className="space-y-2">
              <Label>{t("users.label_plan")}</Label>
              <Select
                value={editPlan}
                onValueChange={setEditPlan}
                dir={isRtl ? "rtl" : "ltr"}
              >
                <SelectTrigger
                  className={`w-full ${isRtl ? "text-right" : "text-left"}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BASIC">{t("plans.BASIC")}</SelectItem>
                  <SelectItem value="PRO">{t("plans.PRO")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-max-devices">
                {t("users.label_max_devices")}
              </Label>
              <Input
                id="edit-max-devices"
                type="number"
                min={1}
                value={editMaxDevices}
                onChange={(e) => setEditMaxDevices(e.target.value)}
                className={isRtl ? "text-right" : "text-left"}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={closeEditPlanDialog}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={editPlanLoading}>
                {editPlanLoading && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {t("common.save_short")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Delete Confirmation Dialog                               */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent
          className="sm:max-w-sm text-right"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t("users.delete_title")}
            </DialogTitle>
            <DialogDescription>
              {t("users.delete_desc")}{" "}
              <strong>{deleteTargetUser?.username}</strong>?{" "}
              {t("common.cant_undo")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={deleteLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
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

export default UserManagement;
