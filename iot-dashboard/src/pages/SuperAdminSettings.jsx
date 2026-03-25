import React, { useState, useEffect } from "react";
import {
  Loader2,
  Settings,
  Mail,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import api from "@/services/api";

const SuperAdminSettings = () => {
  // ── Loading / feedback state ──
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message }

  // ── Form state (controlled inputs) ──
  const [platformName, setPlatformName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [timezone, setTimezone] = useState("Asia/Riyadh");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [retentionDays, setRetentionDays] = useState("90");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // ── Fetch settings on mount ──
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.getSystemSettings();
        const s = res.settings;
        setPlatformName(s.platformName ?? "");
        setSupportEmail(s.supportEmail ?? "");
        setTimezone(s.timezone ?? "Asia/Riyadh");
        setSmtpHost(s.smtpHost ?? "");
        setSmtpPort(s.smtpPort != null ? String(s.smtpPort) : "");
        setSmtpUser(s.smtpUser ?? "");
        setSmtpPass(s.smtpPass ?? "");
        setRetentionDays(
          s.retentionDays != null ? String(s.retentionDays) : "90",
        );
        setMaintenanceMode(s.maintenanceMode ?? false);
      } catch (err) {
        console.error("Failed to load settings:", err);
        setFeedback({
          type: "error",
          message: "فشل تحميل الإعدادات. حاول لاحقاً.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // ── Auto-hide feedback after 4 seconds ──
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // ── Save handler (collects all state, sends to backend) ──
  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await api.updateSystemSettings({
        platformName,
        supportEmail,
        timezone,
        smtpHost: smtpHost || null,
        smtpPort: smtpPort ? Number(smtpPort) : null,
        smtpUser: smtpUser || null,
        smtpPass: smtpPass || null,
        retentionDays: Number(retentionDays) || 90,
        maintenanceMode,
      });
      setFeedback({ type: "success", message: "تم حفظ الإعدادات بنجاح ✓" });
    } catch (err) {
      console.error("Failed to save settings:", err);
      setFeedback({
        type: "error",
        message: err.message || "فشل حفظ الإعدادات.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div dir="rtl" className="text-right max-w-5xl mx-auto pb-12">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            إعدادات النظام
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            إدارة التكوينات العامة لعمل المنصة
          </p>
        </header>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="mr-3 text-slate-500 text-sm">
            جاري تحميل الإعدادات…
          </span>
        </div>
      </div>
    );
  }

  // ── Save button (reused across tabs) ──
  const SaveButton = () => (
    <div className="pt-4 border-t border-slate-100 flex justify-start">
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="bg-blue-600 hover:bg-blue-700 text-white min-w-35 flex items-center gap-2 justify-center"
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        <span>حفظ الإعدادات</span>
      </Button>
    </div>
  );

  return (
    <div dir="rtl" className="text-right max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          إعدادات النظام
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          إدارة التكوينات العامة لعمل المنصة
        </p>
      </header>

      {/* Feedback toast */}
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

      {/* Tabs Layout */}
      <Tabs defaultValue="general" className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger
            value="general"
            className="flex items-center gap-2 justify-center rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700 text-slate-600 font-medium"
          >
            <Settings className="w-4 h-4" />
            <span>عام</span>
          </TabsTrigger>
          <TabsTrigger
            value="email"
            className="flex items-center gap-2 justify-center rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700 text-slate-600 font-medium"
          >
            <Mail className="w-4 h-4" />
            <span>البريد والإشعارات</span>
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="flex items-center gap-2 justify-center rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700 text-slate-600 font-medium"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>متقدم</span>
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 text-right">
              <CardTitle className="text-lg text-slate-900">
                إعدادات عامة
              </CardTitle>
              <CardDescription className="text-slate-500">
                الملف التعريفي الأساسي للمنصة.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6 text-right">
              <div className="space-y-2 max-w-md text-right">
                <Label htmlFor="platform-name">اسم المنصة</Label>
                <Input
                  id="platform-name"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="bg-white text-right"
                />
              </div>
              <div className="space-y-2 max-w-md text-right">
                <Label htmlFor="support-email">
                  البريد الإلكتروني للدعم الفني
                </Label>
                <Input
                  id="support-email"
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="bg-white text-left"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2 max-w-md text-right">
                <Label htmlFor="timezone">المنطقة الزمنية الافتراضية</Label>
                <select
                  id="timezone"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  dir="ltr"
                >
                  <option value="Asia/Riyadh">Asia/Riyadh (AST)</option>
                  <option value="Africa/Cairo">Africa/Cairo (EET)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              <SaveButton />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email">
          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 text-right">
              <CardTitle className="text-lg text-slate-900">
                إعدادات خادم البريد (SMTP)
              </CardTitle>
              <CardDescription className="text-slate-500">
                تكوين خادم البريد لإرسال التنبيهات ورسائل النظام.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6 text-right">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-right">
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input
                    id="smtp-host"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="bg-white text-left"
                    dir="ltr"
                    placeholder="smtp.mailgun.org"
                  />
                </div>
                <div className="space-y-2 text-right">
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    className="bg-white text-left max-w-37.5"
                    dir="ltr"
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2 text-right">
                  <Label htmlFor="smtp-user">اسم المستخدم</Label>
                  <Input
                    id="smtp-user"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="bg-white text-left"
                    dir="ltr"
                    placeholder="postmaster@example.com"
                  />
                </div>
                <div className="space-y-2 text-right">
                  <Label htmlFor="smtp-pass">كلمة المرور</Label>
                  <Input
                    id="smtp-pass"
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    className="bg-white text-left"
                    dir="ltr"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <SaveButton />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced">
          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 text-right">
              <CardTitle className="text-lg text-slate-900">متقدم</CardTitle>
              <CardDescription className="text-slate-500">
                إعدادات حساسة تؤثر على عمل النظام والبيانات.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-8 text-right">
              <div className="space-y-2 max-w-sm text-right">
                <Label htmlFor="retention">
                  مدة الاحتفاظ بالبيانات (بالأيام)
                </Label>
                <Input
                  id="retention"
                  type="number"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(e.target.value)}
                  className="bg-white text-left"
                  dir="ltr"
                />
                <p className="text-xs text-slate-500 mt-1">
                  سيتم حذف سجلات القراءات والتنبيهات الأقدم من هذه المدة
                  تلقائياً.
                </p>
              </div>

              <div className="flex justify-between items-center rounded-lg border border-red-100 bg-red-50/50 p-4 max-w-2xl">
                <div className="space-y-0.5 text-right flex-1">
                  <Label className="text-base font-semibold text-red-900 block mb-1">
                    وضع الصيانة
                  </Label>
                  <p className="text-sm text-red-700">
                    إيقاف وصول العملاء للنظام مؤقتاً (سيبقى المشرفون قادرين على
                    الدخول).
                  </p>
                </div>
                <div dir="ltr" className="mr-6 shrink-0">
                  <Switch
                    checked={maintenanceMode}
                    onCheckedChange={setMaintenanceMode}
                    className="data-[state=checked]:bg-red-600"
                  />
                </div>
              </div>

              <SaveButton />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminSettings;
