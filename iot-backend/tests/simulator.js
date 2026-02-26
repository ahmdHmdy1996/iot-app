/**
 * WF501 TCP Simulator
 * Connects to the TCP server and sends mock WF501 hex packets every 5 seconds.
 * Usage: node tests/simulator.js <IMEI>
 * Example: node tests/simulator.js 123456789012345
 *
 * IMEI will be padded to 16 digits (BCD). Default port from env TCP_PORT or 8899.
 */

import net from "net";

const TCP_HOST = process.env.TCP_HOST || "localhost";
const TCP_PORT = Number(process.env.TCP_PORT || process.env.PORT) || 8899;
const INTERVAL_MS = 5000;

// CRC-16/MODBUS (same as HexParser.js)
function crc16Modbus(data) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      const lsb = (crc & 0x0001) !== 0;
      crc >>= 1;
      if (lsb) crc ^= 0xa001;
    }
  }
  return crc;
}

/** Convert 16-digit IMEI string to 8-byte BCD buffer */
function imeiToBcd(imei) {
  const digits = String(imei).replace(/\D/g, "").padStart(16, "0").slice(-16);
  const buf = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    buf[i] = parseInt(digits[i * 2], 10) * 16 + parseInt(digits[i * 2 + 1], 10);
  }
  return buf;
}

/**
 * Build a valid WF501 frame (TZ + length + payload + CRC + 0D0A)
 * Payload: $$(2) + HW(2) + FW(4) + IMEI(8) + RTC(6) + statusLen(2) + status(10) + packetIndex(2) = 36 bytes
 */
function buildWf501Frame(imei, temperatureC, humidityRh, batteryVolts, packetIndex) {
  const now = new Date();
  const payload = Buffer.alloc(36);

  let o = 0;

  payload[o++] = 0x24;
  payload[o++] = 0x24; // Protocol "$$"
  payload[o++] = 0x00;
  payload[o++] = 0x01; // Hardware type
  payload[o++] = 0x01;
  payload[o++] = 0x00;
  payload[o++] = 0x00;
  payload[o++] = 0x00; // Firmware 4 bytes
  imeiToBcd(imei).copy(payload, o);
  o += 8;
  payload[o++] = now.getUTCFullYear() - 2000;
  payload[o++] = now.getUTCMonth() + 1;
  payload[o++] = now.getUTCDate();
  payload[o++] = now.getUTCHours();
  payload[o++] = now.getUTCMinutes();
  payload[o++] = now.getUTCSeconds();
  payload[o++] = 0x00;
  payload[o++] = 0x0a; // Status length = 10
  payload[o++] = 0x00; // alarm
  payload[o++] = 0x00; // terminalInfo
  payload[o++] = 0x50; // wifi (e.g. -80 dBm)
  payload[o++] = 0x00; // wifiState
  const batteryRaw = Math.round(Math.max(3.0, Math.min(4.2, batteryVolts)) * 100);
  payload[o++] = (batteryRaw >> 8) & 0xff;
  payload[o++] = batteryRaw & 0xff;
  const tempRaw = Math.round(temperatureC * 10) & 0x3fff;
  payload[o++] = (tempRaw >> 8) & 0xff;
  payload[o++] = tempRaw & 0xff;
  const humRaw = Math.round((humidityRh ?? 0) * 10) & 0x7fff;
  payload[o++] = (humRaw >> 8) & 0xff;
  payload[o++] = humRaw & 0xff;
  payload[o++] = (packetIndex >> 8) & 0xff;
  payload[o++] = packetIndex & 0xff;

  const crc = crc16Modbus(payload);
  const packetLen = 36 + 2; // payload + CRC

  const frame = Buffer.alloc(2 + 2 + packetLen + 2);
  let f = 0;
  frame[f++] = 0x54;
  frame[f++] = 0x5a; // TZ
  frame[f++] = (packetLen >> 8) & 0xff;
  frame[f++] = packetLen & 0xff;
  payload.copy(frame, f);
  f += 36;
  frame[f++] = (crc >> 8) & 0xff;
  frame[f++] = crc & 0xff;
  frame[f++] = 0x0d;
  frame[f++] = 0x0a;

  return frame;
}

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function runSimulator(imei) {
  let packetIndex = 1;
  let socket = null;

  function connectAndSend() {
    socket = new net.Socket();

    socket.connect(TCP_PORT, TCP_HOST, () => {
      const temp = randomInRange(15, 40);
      const humidity = randomInRange(40, 80);
      const voltage = randomInRange(3.5, 4.15);

      const frame = buildWf501Frame(imei, temp, humidity, voltage, packetIndex);
      socket.write(frame);

      console.log(
        `[${new Date().toISOString()}] Sent packet #${packetIndex} | ${temp.toFixed(1)}°C, ${humidity.toFixed(1)}% RH, ${voltage.toFixed(2)}V`
      );
      packetIndex += 1;
    });

    socket.on("data", (data) => {
      const msg = data.toString();
      if (msg.startsWith("@ACK")) console.log("  -> ACK received");
      else if (msg.startsWith("@UTC")) console.log("  -> Sync received");
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err.message);
    });

    socket.on("close", () => {
      socket = null;
    });
  }

  console.log(`WF501 Simulator | IMEI: ${imei} | ${TCP_HOST}:${TCP_PORT} | every ${INTERVAL_MS}ms`);
  connectAndSend();
  setInterval(() => {
    if (socket && socket.writable) {
      const temp = randomInRange(15, 40);
      const humidity = randomInRange(40, 80);
      const voltage = randomInRange(3.5, 4.15);
      const frame = buildWf501Frame(imei, temp, humidity, voltage, packetIndex);
      socket.write(frame);
      console.log(
        `[${new Date().toISOString()}] Sent packet #${packetIndex} | ${temp.toFixed(1)}°C, ${humidity.toFixed(1)}% RH, ${voltage.toFixed(2)}V`
      );
      packetIndex += 1;
    } else {
      connectAndSend();
    }
  }, INTERVAL_MS);
}

const imei = process.argv[2] || "1234567890123456";
if (!/^\d{15,16}$/.test(imei.replace(/\D/g, ""))) {
  console.error("Usage: node tests/simulator.js <IMEI>");
  console.error("IMEI should be 15 or 16 digits.");
  process.exit(1);
}

runSimulator(imei.replace(/\D/g, "").padStart(16, "0").slice(-16));
