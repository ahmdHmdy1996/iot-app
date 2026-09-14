-- The device sends its own clock in every WF501 packet, but only the arrival
-- time was ever stored. A device that buffers a day of readings and uploads
-- them in one burst had them all recorded as if they happened in those few
-- seconds. Keep `timestamp` meaning what it always meant - arrival - and
-- record the device's own time beside it.
ALTER TABLE "readings" ADD COLUMN "recordedAt" TIMESTAMP(3);
ALTER TABLE "readings" ADD COLUMN "clockTrusted" BOOLEAN NOT NULL DEFAULT true;

-- Existing rows have no device time and never will; leaving recordedAt null
-- is the honest answer, and the UI falls back to the arrival time for them.
