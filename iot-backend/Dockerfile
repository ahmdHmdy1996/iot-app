# iot-backend/Dockerfile

FROM node:20-alpine

# Install OpenSSL (Required for Prisma Engine)
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files (must include nodemailer in package.json dependencies)
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies
RUN npm install --ignore-scripts

# Ensure nodemailer is present (required by src/utils/notifications.js)
RUN npm install nodemailer --save --ignore-scripts

# Generate Prisma Client
RUN npx prisma generate

# Copy source code (must run after dependency install so code changes invalidate cache)
COPY . .

# Expose ports
EXPOSE 3000 8899

# Start command
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]