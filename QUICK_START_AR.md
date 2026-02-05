# دليل البدء السريع - نظام مراقبة درجات الحرارة IoT

## 🚀 التثبيت والتشغيل

### المتطلبات الأساسية

- Node.js 18 أو أحدث
- MongoDB (محلي أو سحابي)
- جهاز WF501 (اختياري للاختبار)

---

## الخطوة 1: تشغيل الباك إند (Backend)

### 1. التثبيت

```bash
cd iot-backend
npm install
```

### 2. الإعداد

```bash
cp .env.example .env
```

قم بتعديل ملف `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/iot-monitoring
HTTP_PORT=3000
TCP_PORT=8899
```

### 3. تشغيل MongoDB

```bash
# إذا كنت تستخدم MongoDB محلي
mongod
```

### 4. تشغيل السيرفر

```bash
npm start
```

**النتيجة المتوقعة:**

```
🚀 IoT Temperature Monitoring Backend
📡 HTTP API Server running on port 3000
[TCP] Server listening on port 8899
[MongoDB] Connected successfully
```

---

## الخطوة 2: تسجيل جهاز جديد

استخدم هذا الأمر لتسجيل جهاز WF501:

```bash
curl -X POST http://localhost:3000/admin/devices \
  -H "Content-Type: application/json" \
  -d '{
    "imei": "865421050012345",
    "name": "ثلاجة المطبخ الرئيسية"
  }'
```

**⚠️ مهم جداً:** احفظ الـ `apiKey` من الرد!

مثال على الرد:

```json
{
  "success": true,
  "device": {
    "imei": "865421050012345",
    "name": "ثلاجة المطبخ الرئيسية",
    "apiKey": "550e8400-e29b-41d4-a716-446655440000",
    "isActive": true
  }
}
```

---

## الخطوة 3: تشغيل لوحة التحكم (Dashboard)

### 1. التثبيت

```bash
cd iot-dashboard
npm install
```

### 2. الإعداد

```bash
cp .env.example .env
```

قم بتعديل `.env` وأضف الـ API Key:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_API_KEY=550e8400-e29b-41d4-a716-446655440000
```

### 3. التشغيل

```bash
npm run dev
```

**ستفتح اللوحة على:** `http://localhost:5173`

---

## الخطوة 4: اختبار النظام

### اختبار الـ TCP Server (محاكاة جهاز WF501)

```bash
cd iot-backend
npm test
```

**النتيجة المتوقعة:**

```
Connected to TCP server
Sync message received: @UTC,2025-12-29 22:00:00#
Sending sample hex data...
ACK received - data was processed successfully!
```

### اختبار API

```bash
# فحص الصحة
curl http://localhost:3000/health

# جلب القراءة الحالية
curl http://localhost:3000/api/readings/current \
  -H "x-api-key: YOUR_API_KEY"

# جلب السجل
curl http://localhost:3000/api/readings/history?limit=10 \
  -H "x-api-key: YOUR_API_KEY"
```

### اختبار لوحة التحكم

1. افتح `http://localhost:5173`
2. يجب أن ترى بطاقة الجهاز في **لوحة المراقبة الحية**
3. انتقل إلى **السجل والتحليلات** للرسوم البيانية
4. جرب تصدير البيانات (Excel/PDF)

---

## إعداد جهاز WF501 الحقيقي

### معلومات الاتصال

- **عنوان IP**: عنوان السيرفر الخاص بك
- **البورت**: 8899 (أو حسب إعدادك في `.env`)
- **البروتوكول**: TCP

### سير العمل

1. الجهاز يتصل بالسيرفر
2. السيرفر يرسل: `@UTC,2025-12-29 22:00:00#`
3. الجهاز يرسل بيانات Hex
4. السيرفر يحلل البيانات ويحفظها
5. السيرفر يرد: `@ACK,{رقم الباقة}#`

---

## المشاكل الشائعة وحلولها

### ❌ "Cannot connect to MongoDB"

**الحل:**

```bash
# تأكد من تشغيل MongoDB
mongod

# أو استخدم MongoDB Atlas (سحابي)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/iot
```

### ❌ "API key is required"

**الحل:**

- تأكد من وجود `.env` في `iot-dashboard/`
- تأكد من نسخ `VITE_API_KEY` بشكل صحيح
- أعد تشغيل `npm run dev` بعد تعديل `.env`

### ❌ "No response from server"

**الحل:**

- تأكد من تشغيل الباك إند (`npm start`)
- تحقق من `VITE_API_BASE_URL` في `.env`
- تأكد من عدم حجب البورت 3000

### ❌ الجهاز يظهر "غير متصل"

**الحل:**

- الجهاز لم يرسل بيانات منذ أكثر من 10 دقائق
- تحقق من اتصال الجهاز بالإنترنت
- راجع سجلات الـ TCP Server

---

## الأوامر المفيدة

### الباك إند

```bash
# التشغيل
npm start

# التطوير (مع إعادة التشغيل التلقائي)
npm run dev

# الاختبار
npm test
```

### الفرونت إند

```bash
# التطوير
npm run dev

# البناء للنشر
npm run build

# معاينة البناء
npm run preview
```

### MongoDB

```bash
# الاتصال بقاعدة البيانات
mongosh iot-monitoring

# عرض الأجهزة
db.devices.find().pretty()

# عرض القراءات
db.readings.find().limit(10).sort({timestamp: -1}).pretty()

# حذف كل البيانات (للاختبار فقط!)
db.readings.deleteMany({})
```

---

## الخطوات القادمة

### 1. ضبط حدود درجات الحرارة

عدّل `iot-dashboard/src/config/constants.js`:

```javascript
export const TEMP_WARNING_THRESHOLD = 10; // °C
export const TEMP_CRITICAL_THRESHOLD = 15; // °C
```

### 2. ضبط فترة التحديث التلقائي

```javascript
export const REFRESH_INTERVAL = 60000; // 60 ثانية
```

### 3. إضافة أجهزة متعددة

كرر عملية التسجيل لكل جهاز:

```bash
curl -X POST http://localhost:3000/admin/devices \
  -H "Content-Type: application/json" \
  -d '{"imei":"NEW_IMEI","name":"جهاز جديد"}'
```

### 4. النشر للإنتاج

راجع ملفات README للحصول على تعليمات النشر الكاملة:

- `iot-backend/README.md`
- `iot-dashboard/README.md`

---

## الدعم الفني

### الوثائق الكاملة

- [Backend README](./iot-backend/README.md)
- [Frontend README](./iot-dashboard/README.md)
- [Main README](./README.md)
- [Walkthrough](../.gemini/antigravity/brain/cb98ec24-3728-43a6-9607-59538e20bc84/walkthrough.md)

### هيكل المشروع

```
d:/GitHub/Temp/
├── iot-backend/          # Node.js Backend
│   ├── src/
│   │   ├── models/      # MongoDB Schemas
│   │   ├── tcp/         # TCP Server
│   │   ├── routes/      # API Routes
│   │   └── middleware/  # Authentication
│   └── tests/
│
├── iot-dashboard/        # React Frontend
│   └── src/
│       ├── pages/       # Live Monitor, History
│       ├── components/  # StatusCard
│       └── services/    # API Service
│
└── README.md
```

---

## ✅ قائمة التحقق السريعة

- [ ] MongoDB يعمل
- [ ] Backend يعمل على البورت 3000
- [ ] TCP Server يعمل على البورت 8899
- [ ] تم تسجيل جهاز واحد على الأقل
- [ ] تم حفظ API Key
- [ ] Frontend يعمل على البورت 5173
- [ ] `.env` تم إعداده بشكل صحيح
- [ ] تم اختبار الاتصال بنجاح

**🎉 إذا كانت جميع النقاط محققة، النظام جاهز للاستخدام!**
