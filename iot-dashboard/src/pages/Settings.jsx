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
  Phone,
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
import { useTranslation } from "react-i18next";

const Settings = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  // ── Loading & feedback ──
  const [isLoading, setIsLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message }

  // ── Profile state ──
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("CLIENT");
  const [plan, setPlan] = useState("BASIC");
  const [maxDevices, setMaxDevices] = useState(5);
  const [deviceCount, setDeviceCount] = useState(0);
  const [alertPhone, setAlertPhone] = useState("");

  // ── Password state ──
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ── Sync the localStorage "user" object so App.jsx / Sidebar always get fresh data ──
  const syncLocalUser = (u) => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      const merged = {
        ...stored,
        username: u.username ?? stored.username,
        role: u.role ?? stored.role,
        plan: u.plan ?? stored.plan,
        maxDevices: u.maxDevices ?? stored.maxDevices,
        deviceCount: u.deviceCount ?? stored.deviceCount,
      };
      localStorage.setItem("user", JSON.stringify(merged));
    } catch {
      /* ignore parse errors */
    }
  };

  // ── Fetch profile on mount ──
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.getProfile();
        const u = res.user;
        setUsername(u.username ?? "");
        setRole(u.role ?? "CLIENT");
        setPlan(u.plan ?? "BASIC");
        setMaxDevices(u.maxDevices ?? 5);
        setDeviceCount(u.deviceCount ?? 0);
        setAlertPhone(u.alertWhatsApp ?? "");
        syncLocalUser(u);
      } catch (err) {
        console.error("Failed to load profile:", err);
        setFeedback({
          type: "error",
          message: t("settings.error_load"),
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

  // ── Save profile (alertWhatsApp) ──
  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setFeedback(null);
    try {
      const res = await api.updateProfile({
        alertWhatsApp: alertPhone.trim() || null,
      });
      const u = res.user;
      if (u) {
        setAlertPhone(u.alertWhatsApp ?? "");
        if (u.role !== undefined) setRole(u.role);
        if (u.maxDevices !== undefined) setMaxDevices(u.maxDevices);
        if (u.deviceCount !== undefined) setDeviceCount(u.deviceCount);
        syncLocalUser(u);
      }
      setFeedback({ type: "success", message: t("settings.success_save") });
    } catch (err) {
      console.error("Failed to save profile:", err);
      setFeedback({
        type: "error",
        message: err.message || t("settings.error_save"),
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
        message: t("settings.validation_password_empty"),
      });
      return;
    }
    if (newPassword.trim().length < 6) {
      setFeedback({
        type: "error",
        message: t("settings.validation_password_short"),
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({
        type: "error",
        message: t("settings.validation_password_mismatch"),
      });
      return;
    }

    setPasswordSaving(true);
    setFeedback(null);
    try {
      await api.updateProfile({ password: newPassword.trim() });
      setNewPassword("");
      setConfirmPassword("");
      setFeedback({ type: "success", message: t("settings.success_password") });
    } catch (err) {
      console.error("Failed to update password:", err);
      setFeedback({
        type: "error",
        message: err.message || t("settings.error_password"),
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div
        dir={isRtl ? "rtl" : "ltr"}
        className={`${isRtl ? "text-right" : "text-left"} max-w-5xl mx-auto pb-12`}
      >
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t("settings.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("settings.subtitle")}
          </p>
        </header>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ms-3 text-slate-500 text-sm">
            {t("settings.loading_data")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={`${isRtl ? "text-right" : "text-left"} max-w-5xl mx-auto pb-12`}
    >
      {/* ── Page Header ── */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t("settings.subtitle")}</p>
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
          <CardHeader
            className={`bg-slate-50/50 border-b border-slate-100 pb-4 ${isRtl ? "text-right" : "text-left"}`}
          >
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg text-slate-900">
                {t("settings.profile_title")}
              </CardTitle>
            </div>
            <CardDescription className="text-slate-500">
              {t("settings.profile_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent
            className={`pt-6 space-y-6 ${isRtl ? "text-right" : "text-left"}`}
          >
            {/* Username (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                {t("settings.label_username")}
              </Label>
              <Input
                id="username"
                value={username}
                readOnly
                className="bg-slate-50 text-left text-slate-500 cursor-not-allowed"
                dir="ltr"
              />
              <p className="text-xs text-slate-400">
                {t("settings.username_readonly")}
              </p>
            </div>

            {/* Plan Badge */}
            <div className="space-y-2">
              <Label>{t("settings.label_plan")}</Label>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    plan === "PRO"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }
                  variant="outline"
                >
                  {t("plans." + (plan || "BASIC"))}
                </Badge>
                {role === "ADMIN" ? (
                  <span className="text-sm text-slate-500">
                    {deviceCount} {t("settings.devices_label")}
                  </span>
                ) : (
                  <span className="text-sm text-slate-500">
                    {maxDevices} {t("settings.devices_label")}
                  </span>
                )}
              </div>
            </div>

            {/* Alert Phone */}
            <div className="space-y-2">
              <Label
                htmlFor="alert-phone"
                className="flex items-center gap-1.5"
              >
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                {t("settings.label_alert_phone")}
              </Label>
              <Input
                id="alert-phone"
                type="tel"
                value={alertPhone}
                onChange={(e) => setAlertPhone(e.target.value)}
                className="bg-white text-left"
                dir="ltr"
                placeholder="+966 5xxxxxxxx"
              />
              <p className="text-xs text-slate-500">
                {t("settings.alert_phone_hint")}
              </p>
            </div>

            {/* Save Profile Button */}
            <div className="pt-4 border-t border-slate-100 flex justify-start">
              <Button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-35 flex items-center gap-2 justify-center"
              >
                {profileSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{t("settings.btn_save_profile")}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Column 2: Security / Password ── */}
        <Card className="border-slate-200 shadow-sm rounded-xl">
          <CardHeader
            className={`bg-slate-50/50 border-b border-slate-100 pb-4 ${isRtl ? "text-right" : "text-left"}`}
          >
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-lg text-slate-900">
                {t("settings.security_title")}
              </CardTitle>
            </div>
            <CardDescription className="text-slate-500">
              {t("settings.security_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent
            className={`pt-6 space-y-6 ${isRtl ? "text-right" : "text-left"}`}
          >
            {/* New Password */}
            <div className="space-y-2">
              <Label
                htmlFor="new-password"
                className="flex items-center gap-1.5"
              >
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                {t("settings.label_new_password")}
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
                {t("settings.label_confirm_password")}
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
                    {t("settings.password_mismatch")}
                  </p>
                )}
            </div>

            {/* Update Password Button */}
            <div className="pt-4 border-t border-slate-100 flex justify-start">
              <Button
                onClick={handleUpdatePassword}
                disabled={passwordSaving}
                className="bg-amber-600 hover:bg-amber-700 text-white min-w-40 flex items-center gap-2 justify-center"
              >
                {passwordSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                <span>{t("settings.btn_update_password")}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
