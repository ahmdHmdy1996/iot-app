/**
 * Dedicated utility for CaterFlow specific webhooks.
 * Uses fetch to send real-time alerts to the configured CaterFlow endpoint.
 */

const WEBHOOK_TIMEOUT = 5000;

/**
 * Sends a POST request to CaterFlow when an alert is triggered.
 * 
 * @param {Object} alertData - Data related to the triggered alert
 * @param {string} alertData.imei - Device IMEI
 * @param {string} alertData.externalRefId - Reference ID in CaterFlow system
 * @param {string} alertData.alertType - Type of alert (e.g., TEMPERATURE_HIGH)
 * @param {number} alertData.currentValue - The reading value that triggered the alert
 * @param {number} alertData.threshold - The limit that was exceeded
 * @param {string} alertData.timestamp - ISO timestamp of the event
 */
export const sendCaterflowWebhook = async (alertData) => {
  const url = process.env.CATERFLOW_WEBHOOK_URL;

  if (!url) {
    console.warn("[CaterFlow-Webhook] Skipping: CATERFLOW_WEBHOOK_URL is not configured.");
    return;
  }

  const payload = {
    event: "temperature_alert",
    data: {
      imei: alertData.imei,
      restaurant_id: alertData.externalRefId,
      alert_type: alertData.alertType,
      value: alertData.currentValue,
      threshold: alertData.threshold,
      occurred_at: alertData.timestamp,
    },
    system: "iot-monitor-v1"
  };

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Source-System": "IoT-Backend"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(id);

    if (!response.ok) {
      console.warn(`[CaterFlow-Webhook] Delivery failed: ${response.status} ${response.statusText}`);
    } else {
      console.log(`[CaterFlow-Webhook] Alert successfully delivered to ${url}`);
    }
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("[CaterFlow-Webhook] Error: Request timed out.");
    } else {
      console.error("[CaterFlow-Webhook] Error sending webhook:", error.message);
    }
  }
};
/**
 * Sends a POST request to CaterFlow when a real-time reading is received.
 * 
 * @param {Object} readingData - Data related to the device reading
 * @param {string} readingData.imei - Device IMEI
 * @param {string} readingData.externalRefId - Reference ID in CaterFlow system
 * @param {number} readingData.temperature - Temperature value
 * @param {number} readingData.humidity - Humidity value
 * @param {string} readingData.battery - Battery percentage string (e.g., "100%")
 * @param {string} readingData.timestamp - ISO timestamp of the reading
 */
export const sendCaterflowReadingWebhook = async (readingData) => {
  const url = process.env.CATERFLOW_WEBHOOK_URL;

  if (!url) {
    console.warn("[CaterFlow-Reading-Webhook] Skipping: CATERFLOW_WEBHOOK_URL is not configured.");
    return;
  }

  // Sanitise every numeric field to a plain JS number so NestJS @IsNumber()
  // passes without coercion issues.
  // battery arrives as "97%" — strip the % and parse to float.
  const batteryNum = (() => {
    const raw = readingData.battery;
    if (raw == null) return 0;
    const parsed = parseFloat(String(raw).replace("%", ""));
    return isNaN(parsed) ? 0 : parsed;
  })();

  const payload = {
    event: "device_reading",
    // CaterFlow's IotWebhookDto expects live readings under the "reading" key
    reading: {
      imei: String(readingData.imei),
      temperature: parseFloat(readingData.temperature) || 0,
      humidity: readingData.humidity != null ? parseFloat(readingData.humidity) : 0,
      battery: batteryNum,
      timestamp: readingData.timestamp,
    }
  };

  console.log(`[CaterFlow-Reading-Webhook] → POST ${url} | imei=${readingData.imei} temp=${payload.reading.temperature}`);

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Source-System": "IoT-Backend" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(id);

    if (!response.ok) {
      let body = "";
      try { body = await response.text(); } catch {}
      console.warn(`[CaterFlow-Reading-Webhook] ✗ ${response.status} ${response.statusText} | body: ${body}`);
    } else {
      console.log(`[CaterFlow-Reading-Webhook] ✓ Delivered to ${url}`);
    }
  } catch (error) {
    if (error.name === "AbortError") {
      console.error(`[CaterFlow-Reading-Webhook] ✗ Timeout after ${WEBHOOK_TIMEOUT}ms → ${url}`);
    } else {
      console.error(`[CaterFlow-Reading-Webhook] ✗ ${error.message} → ${url}`);
    }
  }
};
