# iot-backend/Dockerfile

FROM node:20-alpine

# Install OpenSSL (Required for Prisma Engine)
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install --ignore-scripts

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Expose ports
EXPOSE 3000 8899

# Start command
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]