-- CreateTable
CREATE TABLE "devices" (
    "imei" TEXT NOT NULL,
    "name" TEXT,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("imei")
);

-- CreateTable
CREATE TABLE "readings" (
    "id" SERIAL NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "humidity" DOUBLE PRECISION,
    "voltage" DOUBLE PRECISION,
    "packetIndex" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceImei" TEXT NOT NULL,

    CONSTRAINT "readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_apiKey_key" ON "devices"("apiKey");

-- CreateIndex
CREATE INDEX "readings_deviceImei_timestamp_idx" ON "readings"("deviceImei", "timestamp" DESC);

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_deviceImei_fkey" FOREIGN KEY ("deviceImei") REFERENCES "devices"("imei") ON DELETE CASCADE ON UPDATE CASCADE;
