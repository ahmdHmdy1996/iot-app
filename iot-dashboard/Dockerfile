# مرحلة البناء (Build Stage)
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# مرحلة التشغيل (Production Stage)
FROM nginx:alpine
# نسخ ملفات الـ Build لمكانها في Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# إعداد Nginx عشان يدعم React Router (عشان التحديث ميعملش 404)
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html index.htm; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]