/**
 * Outbound notifications: Email (nodemailer) and WhatsApp (generic REST API).
 * All functions catch errors and log only; they never throw.
 * Nodemailer is lazy-loaded on first use so the server starts even if the package is missing.
 */

let _nodemailer = null;

async function getNodemailer() {
  if (_nodemailer !== null) return _nodemailer;
  try {
    const mod = await import("nodemailer");
    _nodemailer = mod.default;
    return _nodemailer;
  } catch (e) {
    console.warn("[Notifications] nodemailer not installed; email alerts skipped. Run: npm install nodemailer");
    _nodemailer = false; // mark as "tried and failed"
    return null;
  }
}

/**
 * Send an email alert via SMTP (nodemailer).
 * Uses env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 */
export async function sendEmailAlert(to, subject, text) {
  if (!to || typeof to !== "string" || !to.trim()) return;

  const nodemailer = await getNodemailer();
  if (!nodemailer) return;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || "alerts@iot.local";

  if (!host) {
    console.warn("[Notifications] SMTP_HOST not set, skipping email");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });

    await transporter.sendMail({
      from,
      to: to.trim(),
      subject: subject || "IoT Alert",
      text: text || "",
    });

    console.log("[Notifications] Email sent to", to.trim());
  } catch (err) {
    console.warn("[Notifications] Email failed:", err?.message);
  }
}

/**
 * Send a WhatsApp alert via a generic REST API (WhatsApp Business API provider).
 * Uses env: WHATSAPP_API_URL, WHATSAPP_API_TOKEN.
 * Payload is a generic JSON shape; adapt to your provider (e.g. to/body, recipient/message).
 * @param {string} to - Recipient phone number (e.g. +966501234567)
 * @param {string} text - Message body
 */
export async function sendWhatsAppAlert(to, text) {
  if (!to || typeof to !== "string" || !to.trim()) return;

  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;

  if (!apiUrl || !apiUrl.trim()) {
    console.warn("[Notifications] WHATSAPP_API_URL not set, skipping WhatsApp");
    return;
  }

  try {
    // Generic payload; customize keys to match your provider (e.g. "recipient"/"message", "to"/"body")
    const payload = {
      to: to.trim(),
      text: text || "IoT Alert",
      message: text || "IoT Alert",
    };

    const headers = {
      "Content-Type": "application/json",
      ...(apiToken && { Authorization: `Bearer ${apiToken}` }),
    };

    const response = await fetch(apiUrl.trim(), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn(
        "[Notifications] WhatsApp API error:",
        response.status,
        response.statusText,
        body?.slice(0, 200),
      );
      return;
    }

    console.log("[Notifications] WhatsApp sent to", to.trim());
  } catch (err) {
    console.warn("[Notifications] WhatsApp failed:", err?.message);
  }
}
