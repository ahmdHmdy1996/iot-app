import React, { useState, useEffect } from "react";
import {
  Loader2,
  Save,
  User,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Lock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/services/api";

const Settings = () => {
  // ── Loading & feedback ──
  const [isLoading, setIsLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message }

  // ── Profile state ──
  const [username, setUsername] = useState("");
  const [plan, setPlan] = useState("BASIC");
  const [alertEmail, setAlertEmail] = useState("");

  // ── Password state ──
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ── Fetch profile on mount ──
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.getProfile();
        const u = res.user;
        setUsername(u.username ?? "");
        setPlan(u.plan ?? "BASIC");
        setAlertEmail(u.alertEmail ?? "");
      } catch (err) {
        console.error("Failed to load profile:", err);
        setFeedback({
          type: "error",
          message: "فشل تحميل بيانات الحساب. حاول لاحقاً.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ── Auto-dismiss feedback ──
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // ── Save profile (alertEmail) ──
  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setFeedback(null);
    try {
      const res = await api.updateProfile({
        alertEmail: alertEmail.trim() || null,
      });
      // Sync state with server response
      const u = res.user;
      if (u) {
        setAlertEmail(u.alertEmail ?? "");
      }
      setFeedback({ type: "success", message: "تم حفظ البيانات بنجاح ✓" });
    } catch (err) {
      console.error("Failed to save profile:", err);
      setFeedback({
        type: "error",
        message: err.message || "فشل حفظ البيانات.",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Update password ──
  const handleUpdatePassword = async () => {
    // Validation
    if (!newPassword.trim()) {
      setFeedback({
        type: "error",
        message: "يرجى إدخال كلمة المرور الجديدة.",
      });
      return;
    }
    if (newPassword.trim().length < 6) {
      setFeedback({
        type: "error",
        message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", message: "كلمتا المرور غير متطابقتين." });
      return;
    }

    setPasswordSaving(true);
    setFeedback(null);
    try {
      await api.updateProfile({ password: newPassword.trim() });
      setNewPassword("");
      setConfirmPassword("");
      setFeedback({ type: "success", message: "تم تحديث كلمة المرور بنجاح ✓" });
    } catch (err) {
      console.error("Failed to update password:", err);
      setFeedback({
        type: "error",
        message: err.message || "فشل تحديث كلمة المرور.",
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div dir="rtl" className="text-right max-w-5xl mx-auto pb-12">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            إعدادات الحساب
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            إدارة بياناتك الشخصية وتفضيلات الإشعارات
          </p>
        </header>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="mr-3 text-slate-500 text-sm">
            جاري تحميل البيانات…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="text-right max-w-5xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          إعدادات الحساب
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          إدارة بياناتك الشخصية وتفضيلات الإشعارات
        </p>
      </header>

      {/* ── Feedback Banner ── */}
      {feedback && (
        <div
          className={`mb-6 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          {feedback.message}
        </div>
      )}

      {/* ── Two-Column Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Column 1: Profile & Alerts ── */}
        <Card className="border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 text-right">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg text-slate-900">
                الملف الشخصي والإشعارات
              </CardTitle>
            </div>
            <CardDescription className="text-slate-500">
              معلومات حسابك وإعدادات التنبيهات
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6 text-right">
            {/* Username (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                البريد الإلكتروني (اسم المستخدم)
              </Label>
              <Input
                id="username"
                value={username}
                readOnly
                className="bg-slate-50 text-left text-slate-500 cursor-not-allowed"
                dir="ltr"
              />
              <p className="text-xs text-slate-400">
                لا يمكن تغيير اسم المستخدم.
              </p>
            </div>

            {/* Plan Badge */}
            <div className="space-y-2">
              <Label>الباقة الحالية</Label>
              <div>
                <Badge
                  className={
                    plan === "PRO"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }
                  variant="outline"
                >
                  {plan === "PRO" ? "PRO" : "BASIC"}
                </Badge>
              </div>
            </div>

            {/* Alert Email */}
            <div className="space-y-2">
              <Label
                htmlFor="alert-email"
                className="flex items-center gap-1.5"
              >
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                البريد الإلكتروني للإشعارات
              </Label>
              <Input
                id="alert-email"
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                className="bg-white text-left"
                dir="ltr"
                placeholder="alerts@example.com"
              />
              <p className="text-xs text-slate-500">
                سيتم إرسال تنبيهات الحرارة العالية إلى هذا البريد.
              </p>
            </div>

            {/* Save Profile Button */}
            <div className="pt-4 border-t border-slate-100 flex justify-start">
              <Button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] flex items-center gap-2 justify-center"
              >
                {profileSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>حفظ البيانات</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Column 2: Security / Password ── */}
        <Card className="border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 text-right">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-lg text-slate-900">
                الأمان وكلمة المرور
              </CardTitle>
            </div>
            <CardDescription className="text-slate-500">
              تحديث كلمة المرور الخاصة بحسابك
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6 text-right">
            {/* New Password */}
            <div className="space-y-2">
              <Label
                htmlFor="new-password"
                className="flex items-center gap-1.5"
              >
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                كلمة المرور الجديدة
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-white text-left"
                dir="ltr"
                placeholder="••••••••"
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label
                htmlFor="confirm-password"
                className="flex items-center gap-1.5"
              >
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                تأكيد كلمة المرور
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-white text-left"
                dir="ltr"
                placeholder="••••••••"
              />
              {newPassword &&
                confirmPassword &&
                newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 font-medium">
                    كلمتا المرور غير متطابقتين.
                  </p>
                )}
            </div>

            {/* Update Password Button */}
            <div className="pt-4 border-t border-slate-100 flex justify-start">
              <Button
                onClick={handleUpdatePassword}
                disabled={passwordSaving}
                className="bg-amber-600 hover:bg-amber-700 text-white min-w-[160px] flex items-center gap-2 justify-center"
              >
                {passwordSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                <span>تحديث كلمة المرور</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
