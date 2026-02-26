import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Thermometer,
  ShieldCheck,
  BarChart3,
  Mail,
  Lock,
  KeyRound,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import apiService from "../services/api";
import { AUTH_TOKEN_KEY } from "../config/constants";

/**
 * Register Page – Premium split-screen layout, RTL Arabic
 */
const Register = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password || !confirmPassword) {
      setError("يرجى ملء جميع الحقول");
      return;
    }

    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.register({ username, password });

      if (res?.success && res?.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, res.token);
        const user = res.user || { username, role: "CLIENT" };
        localStorage.setItem("user", JSON.stringify(user));
        navigate("/", { replace: true });
      } else {
        setError("فشل إنشاء الحساب");
      }
    } catch (err) {
      setError(err?.message || "فشل إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-row-reverse">
      {/* ─── Right Side: Form Area (RTL) ─── */}
      <div
        dir="rtl"
        className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white"
      >
        <div className="max-w-md w-full">
          {/* Logo / Brand Mark */}
          <div className="flex items-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center">
              <Thermometer className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">
              IoT Monitor
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            إنشاء حساب جديد
          </h1>
          <p className="text-slate-500 mb-8">ابدأ في مراقبة أجهزتك الآن</p>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700">
                البريد الإلكتروني
              </Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="أدخل اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pr-10 h-11 bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">
                كلمة المرور
              </Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 h-11 bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-700">
                تأكيد كلمة المرور
              </Label>
              <div className="relative">
                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="أعد إدخال كلمة المرور"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10 h-11 bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-base font-medium bg-slate-900 hover:bg-slate-800"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري إنشاء الحساب...
                </>
              ) : (
                "إنشاء حساب"
              )}
            </Button>
          </form>

          {/* Login Link */}
          <p className="mt-6 text-center text-sm text-slate-500">
            لديك حساب بالفعل؟{" "}
            <Link
              to="/login"
              className="font-semibold text-slate-900 hover:text-slate-700 transition-colors"
            >
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>

      {/* ─── Left Side: Branding Area ─── */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 items-center justify-center flex-col text-white p-12 relative overflow-hidden">
        {/* Decorative Background Shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-slate-800/50" />
          <div className="absolute bottom-12 right-12 w-72 h-72 rounded-full bg-slate-800/30" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-blue-500/10" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-lg text-center space-y-8">
          {/* Icon */}
          <div className="mx-auto h-20 w-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <Thermometer className="h-10 w-10 text-blue-400" />
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-bold leading-relaxed">
              مراقبة ذكية لحرارة أجهزتك
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              نظام متكامل لضمان جودة التخزين وسلامة المنتجات
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 gap-4 mt-8 text-right" dir="rtl">
            <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 backdrop-blur-sm border border-white/10">
              <div className="h-9 w-9 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                <BarChart3 className="h-4 w-4 text-blue-400" />
              </div>
              <span className="text-sm text-slate-300">
                تحليلات مباشرة ورسوم بيانية تفاعلية
              </span>
            </div>
            <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 backdrop-blur-sm border border-white/10">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-sm text-slate-300">
                تنبيهات فورية عند تجاوز الحدود
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
