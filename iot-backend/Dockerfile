# iot-backend/Dockerfile

FROM node:20-alpine

WORKDIR /app

# نسخ ملفات تعريف المشروع
COPY package*.json ./
COPY prisma ./prisma/

# تثبيت المكاتب
RUN npm install

# توليد عميل Prisma
RUN npx prisma generate

# نسخ باقي كود المشروع
COPY . .

# فتح البورتات
EXPOSE 3000 8899

# أمر التشغيل (مع الميغريشن)
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]