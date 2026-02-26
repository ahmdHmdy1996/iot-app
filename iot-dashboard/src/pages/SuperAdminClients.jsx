import React, { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import moment from "moment";
import "moment/locale/ar";

const PLAN_OPTIONS = [
  { value: "BASIC", label: "BASIC" },
  { value: "PRO", label: "PRO" },
];

const ROLE_OPTIONS = [
  { value: "CLIENT", label: "عميل" },
  { value: "ADMIN", label: "مدير" },
  { value: "SUPER_ADMIN", label: "مشرف أعلى" },
];

const SuperAdminClients = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");

  // Add form state
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addPlan, setAddPlan] = useState("BASIC");
  const [addMaxDevices, setAddMaxDevices] = useState(5);

  // Edit form state
  const [editPlan, setEditPlan] = useState("BASIC");
  const [editMaxDevices, setEditMaxDevices] = useState(5);
  const [editRole, setEditRole] = useState("CLIENT");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAllUsers();
      if (res?.data) setUsers(res.data);
      else setUsers([]);
    } catch (err) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openAddModal = () => {
    setError("");
    setAddUsername("");
    setAddPassword("");
    setAddPlan("BASIC");
    setAddMaxDevices(5);
    setOpenAdd(true);
  };

  const openEditModal = (user) => {
    setError("");
    setEditingUser(user);
    setEditPlan(user.plan || "BASIC");
    setEditMaxDevices(user.maxDevices ?? 5);
    setEditRole(user.role || "CLIENT");
    setOpenEdit(true);
  };

  const closeAddModal = () => {
    setOpenAdd(false);
    setError("");
  };

  const closeEditModal = () => {
    setOpenEdit(false);
    setEditingUser(null);
    setError("");
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!addUsername?.trim()) {
      setError("اسم المستخدم مطلوب");
      return;
    }
    if (!addPassword?.trim()) {
      setError("كلمة المرور مطلوبة");
      return;
    }
    setSubmitLoading(true);
    try {
      await api.createUserSuperAdmin({
        username: addUsername.trim(),
        password: addPassword,
        plan: addPlan,
        maxDevices: Number(addMaxDevices) || 5,
        role: "CLIENT",
      });
      closeAddModal();
      await fetchUsers();
    } catch (err) {
      setError(err.message || "فشل في إضافة العميل");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setError("");
    setSubmitLoading(true);
    try {
      await api.updateUser(editingUser.id, {
        plan: editPlan,
        maxDevices: Number(editMaxDevices) || 5,
        role: editRole,
      });
      closeEditModal();
      await fetchUsers();
    } catch (err) {
      setError(err.message || "فشل في تحديث العميل");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا العميل؟")) return;
    try {
      await api.deleteUser(user.id);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      alert(err.message || "فشل في حذف العميل");
    }
  };

  return (
    <div dir="rtl" className="text-right">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            إدارة العملاء
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            إدارة حسابات المشتركين وباقاتهم
          </p>
        </div>
        <Button className="shrink-0" onClick={openAddModal}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة عميل جديد
        </Button>
      </header>

      <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">قائمة العملاء</CardTitle>
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
                  <TableHead className="text-right font-medium text-slate-600">العميل</TableHead>
                  <TableHead className="text-right font-medium text-slate-600">الخطة</TableHead>
                  <TableHead className="text-right font-medium text-slate-600">الأجهزة المضافة</TableHead>
                  <TableHead className="text-right font-medium text-slate-600">تاريخ الانضمام</TableHead>
                  <TableHead className="text-right font-medium text-slate-600">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                      لا يوجد عملاء
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="border-slate-100">
                      <TableCell className="text-right font-medium text-slate-900">
                        {user.username}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.plan === "BASIC" ? (
                          <Badge variant="secondary">BASIC</Badge>
                        ) : (
                          <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                            {user.plan || "PRO"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-slate-700">
                        {user._count?.devices ?? 0} / {user.maxDevices ?? 0}
                      </TableCell>
                      <TableCell className="text-right text-slate-600">
                        {moment(user.createdAt).locale("ar").format("YYYY-MM-DD")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="تعديل"
                            onClick={() => openEditModal(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="حذف"
                            onClick={() => handleDelete(user)}
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

      {/* Add Client Dialog */}
      <Dialog open={openAdd} onOpenChange={(open) => !open && closeAddModal()}>
        <DialogContent className="sm:max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة عميل</DialogTitle>
            <DialogDescription>
              إدخال بيانات العميل الجديد وحساب الباقة
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">{error}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="add-username">البريد / اسم المستخدم</Label>
              <Input
                id="add-username"
                type="text"
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                placeholder="username@example.com"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">كلمة المرور</Label>
              <Input
                id="add-password"
                type="password"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                placeholder="••••••••"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label>الخطة</Label>
              <Select value={addPlan} onValueChange={setAddPlan}>
                <SelectTrigger className="text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-max">الحد الأقصى للأجهزة</Label>
              <Input
                id="add-max"
                type="number"
                min={1}
                value={addMaxDevices}
                onChange={(e) => setAddMaxDevices(Number(e.target.value) || 5)}
                className="text-right"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeAddModal}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitLoading}>
                {submitLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : null}
                إضافة
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={openEdit} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent className="sm:max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل بيانات العميل</DialogTitle>
            <DialogDescription>
              {editingUser && (
                <span className="text-slate-600">تعديل: {editingUser.username}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">{error}</p>
            )}
            <div className="space-y-2">
              <Label>الخطة</Label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger className="text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-max">الحد الأقصى للأجهزة</Label>
              <Input
                id="edit-max"
                type="number"
                min={1}
                value={editMaxDevices}
                onChange={(e) => setEditMaxDevices(Number(e.target.value) || 5)}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label>الدور</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger className="text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeEditModal}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitLoading}>
                {submitLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : null}
                حفظ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminClients;
