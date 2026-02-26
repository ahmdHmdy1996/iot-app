/**
 * Webhook utility for Cater Flow / external integrations.
 * Sends reading and alert payloads via POST. Failures are logged and never thrown.
 */

const WEBHOOK_TIMEOUT_MS = 10_000;

/**
 * Send a POST request to the user's webhook URL with reading data and optional alerts.
 * Runs asynchronously; never throws. Logs errors so the TCP server is not affected.
 *
 * @param {string} webhookUrl - Full URL to POST to
 * @param {Object} payload - Body to send (reading + alerts)
 * @param {{ temperature: number, humidity?: number, voltage?: number, packetIndex?: number, deviceImei: string, timestamp: string }} payload.reading
 * @param {{ id: number, alertType: string, message: string, timestamp: string, resolved: boolean }[]} [payload.alerts]
 */
export async function sendWebhook(webhookUrl, payload) {
  if (!webhookUrl || typeof webhookUrl !== "string") {
    return;
  }

  const url = webhookUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    console.warn("[Webhook] Invalid URL scheme, skipping:", url.slice(0, 50));
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(
        `[Webhook] ${response.status} ${response.statusText} from ${url.slice(0, 60)}...`,
      );
      return;
    }

    console.log("[Webhook] Payload delivered successfully to", url.slice(0, 60));
  } catch (err) {
    if (err.name === "AbortError") {
      console.warn("[Webhook] Request timeout for", url.slice(0, 60));
    } else {
      console.warn("[Webhook] Request failed:", err.message);
    }
  }
}
