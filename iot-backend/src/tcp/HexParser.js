/**
 * WF501 Hex Data Parser
 * Parses hex packets from WF501 temperature sensors according to protocol specification
 *
 * Frame format:
 * - Start: 'TZ' (0x54 0x5A)
 * - Length: 2 bytes (big-endian) - length from Protocol to CRC inclusive
 * - Protocol: '$$' (0x24 0x24)
 * - Hardware Type: 2 bytes
 * - Firmware: 4 bytes
 * - IMEI: 8 bytes BCD
 * - RTC: 6 bytes (YY MM DD HH mm ss)
 * - Status Length: 2 bytes
 * - Status Data: variable (alarm, terminal info, wifi, battery, temp, humidity)
 * - Packet Index: 2 bytes
 * - CRC: 2 bytes
 * - Stop: 0x0D 0x0A
 */

/**
 * CRC-16/MODBUS calculation
 * @param {Buffer} data - Data to calculate CRC for
 * @returns {number} CRC value
 */
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

/**
 * Convert BCD bytes to digit string
 * @param {Buffer} bcd - BCD encoded bytes
 * @returns {string} Digit string
 */
function bcdToDigits(bcd) {
  let result = "";
  for (let i = 0; i < bcd.length; i++) {
    const hi = (bcd[i] >> 4) & 0x0f;
    const lo = bcd[i] & 0x0f;
    result += hi.toString();
    result += lo.toString();
  }
  return result;
}

/**
 * Decode temperature from raw 2-byte value
 * @param {number} raw - Raw temperature value
 * @returns {{ sensorAbnormal: boolean, negative: boolean, tempC: number|null }}
 */
function decodeTemperature(raw) {
  // 0x8000 indicates sensor not connected
  if (raw === 0x8000) {
    return { sensorAbnormal: true, negative: false, tempC: null };
  }

  const sensorAbnormal = (raw & 0x8000) !== 0; // Bit15
  const negative = (raw & 0x4000) !== 0; // Bit14
  const value = raw & 0x3fff; // Bits 0-13
  let tempC = value * 0.1;

  if (negative) {
    tempC = -tempC;
  }

  return { sensorAbnormal, negative, tempC };
}

/**
 * Decode humidity from raw 2-byte value
 * @param {number} raw - Raw humidity value
 * @returns {{ sensorAbnormal: boolean, rh: number|null }}
 */
function decodeHumidity(raw) {
  // 0x8000 indicates sensor not connected
  if (raw === 0x8000) {
    return { sensorAbnormal: true, rh: null };
  }

  const sensorAbnormal = (raw & 0x8000) !== 0; // Bit15
  const value = raw & 0x7fff; // Bits 0-14
  const rh = value * 0.1;

  return { sensorAbnormal, rh };
}

/**
 * Estimate battery percentage from voltage (Li-Ion)
 * @param {number} voltage - Battery voltage
 * @returns {number} Battery percentage 0-100
 */
function estimateBatteryPercent(voltage) {
  if (voltage <= 3.0) return 0;
  if (voltage >= 4.2) return 100;

  const table = [
    { v: 3.0, p: 0 },
    { v: 3.3, p: 5 },
    { v: 3.45, p: 10 },
    { v: 3.55, p: 20 },
    { v: 3.65, p: 35 },
    { v: 3.72, p: 50 },
    { v: 3.78, p: 60 },
    { v: 3.85, p: 75 },
    { v: 3.92, p: 85 },
    { v: 4.0, p: 92 },
    { v: 4.1, p: 97 },
    { v: 4.2, p: 100 },
  ];

  for (let i = 1; i < table.length; i++) {
    if (voltage <= table[i].v) {
      const v0 = table[i - 1].v;
      const p0 = table[i - 1].p;
      const v1 = table[i].v;
      const p1 = table[i].p;
      const t = (voltage - v0) / (v1 - v0);
      return Math.max(0, Math.min(100, p0 + t * (p1 - p0)));
    }
  }
  return 100;
}

/**
 * Validate and parse a WF501 packet
 * @param {Buffer} frame - Complete frame including TZ header and 0D0A trailer
 * @returns {{ success: boolean, packet: Object|null, error: string|null }}
 */
export function parseWf501Packet(frame) {
  // Start bits 'T' 'Z' = 0x54 0x5A
  if (frame.length < 8 || frame[0] !== 0x54 || frame[1] !== 0x5a) {
    return {
      success: false,
      packet: null,
      error: "Bad start bits (expected TZ) or frame too short",
    };
  }

  // Stop bits 0D0A
  if (
    frame.length < 2 ||
    frame[frame.length - 2] !== 0x0d ||
    frame[frame.length - 1] !== 0x0a
  ) {
    return {
      success: false,
      packet: null,
      error: "Bad stop bits (expected 0D0A)",
    };
  }

  // Packet length (from Protocol to CRC inclusive)
  const packetLen = (frame[2] << 8) | frame[3];
  const expectedTotalLen = 2 + 2 + packetLen + 2; // TZ + len + payload+CRC + stop

  if (frame.length !== expectedTotalLen) {
    return {
      success: false,
      packet: null,
      error: `Length mismatch. Header says ${packetLen}, total should be ${expectedTotalLen}, got ${frame.length}`,
    };
  }

  // Payload is from Protocol to CRC inclusive
  const payloadPlusCrc = frame.slice(4, 4 + packetLen);
  if (payloadPlusCrc.length < 4) {
    return { success: false, packet: null, error: "Payload too short" };
  }

  // CRC is last 2 bytes of payloadPlusCrc
  const payload = payloadPlusCrc.slice(0, payloadPlusCrc.length - 2);
  const crcFromPacket =
    (payloadPlusCrc[payloadPlusCrc.length - 2] << 8) |
    payloadPlusCrc[payloadPlusCrc.length - 1];
  const crcComputed = crc16Modbus(payload);

  if (crcFromPacket !== crcComputed) {
    return {
      success: false,
      packet: null,
      error: `CRC mismatch. Packet=0x${crcFromPacket.toString(16).toUpperCase()}, Computed=0x${crcComputed.toString(16).toUpperCase()}`,
    };
  }

  let offset = 0;

  // Protocol number 2 bytes ('$$')
  if (payload.length < offset + 2) {
    return { success: false, packet: null, error: "Missing protocol" };
  }
  const protocol = payload.slice(offset, offset + 2).toString("ascii");
  offset += 2;

  // Hardware type 2 bytes
  if (payload.length < offset + 2) {
    return { success: false, packet: null, error: "Missing hardware type" };
  }
  const hardwareType = (payload[offset] << 8) | payload[offset + 1];
  offset += 2;

  // Firmware 4 bytes
  if (payload.length < offset + 4) {
    return { success: false, packet: null, error: "Missing firmware" };
  }
  const fwMajor = payload[offset];
  const fwMinor = payload[offset + 1];
  offset += 4; // Skip all 4 firmware bytes

  // IMEI 8 bytes BCD -> 16 digits
  if (payload.length < offset + 8) {
    return { success: false, packet: null, error: "Missing IMEI" };
  }
  const imei = bcdToDigits(payload.slice(offset, offset + 8));
  offset += 8;

  // RTC 6 bytes: YY MM DD HH mm ss
  if (payload.length < offset + 6) {
    return { success: false, packet: null, error: "Missing RTC" };
  }
  const yy = payload[offset];
  const mm = payload[offset + 1];
  const dd = payload[offset + 2];
  const hh = payload[offset + 3];
  const mi = payload[offset + 4];
  const ss = payload[offset + 5];
  offset += 6;

  const rtcUtc = new Date(Date.UTC(2000 + yy, mm - 1, dd, hh, mi, ss));

  // Status data length 2 bytes
  if (payload.length < offset + 2) {
    return { success: false, packet: null, error: "Missing status length" };
  }
  const statusLen = (payload[offset] << 8) | payload[offset + 1];
  offset += 2;

  if (statusLen > 0 && payload.length < offset + statusLen) {
    return {
      success: false,
      packet: null,
      error: "Status length exceeds payload",
    };
  }

  // Parse status data
  let alarm = 0,
    terminalInfo = 0,
    wifiSignalDbm = 0,
    wifiState = 0;
  let batteryRaw = 0,
    batteryVolts = 0,
    batteryPercent = 0;
  let tempSensorAbnormal = false,
    tempNegative = false,
    temperatureC = null;
  let humSensorAbnormal = false,
    humidityRh = null;

  if (statusLen >= 10) {
    alarm = payload[offset++];
    terminalInfo = payload[offset++];

    // WiFi signal (unit "-dBm")
    const wifiRaw = payload[offset++];
    wifiSignalDbm = -Math.abs(wifiRaw);

    wifiState = payload[offset++];

    // Battery voltage (10mV units)
    batteryRaw = (payload[offset] << 8) | payload[offset + 1];
    offset += 2;
    batteryVolts = batteryRaw * 0.01;
    batteryPercent = estimateBatteryPercent(batteryVolts);

    // Temperature
    const tempRaw = (payload[offset] << 8) | payload[offset + 1];
    offset += 2;
    const tempResult = decodeTemperature(tempRaw);
    tempSensorAbnormal = tempResult.sensorAbnormal;
    tempNegative = tempResult.negative;
    temperatureC = tempResult.tempC;

    // Humidity
    const humRaw = (payload[offset] << 8) | payload[offset + 1];
    offset += 2;
    const humResult = decodeHumidity(humRaw);
    humSensorAbnormal = humResult.sensorAbnormal;
    humidityRh = humResult.rh;
  } else if (statusLen > 0) {
    offset += statusLen; // Skip unknown status block
  }

  // Packet index 2 bytes
  if (payload.length < offset + 2) {
    return { success: false, packet: null, error: "Missing packet index" };
  }
  const packetIndex = (payload[offset] << 8) | payload[offset + 1];
  offset += 2;

  const packet = {
    packetLength: packetLen,
    protocol,
    hardwareType,
    firmware: `${fwMajor}.${fwMinor}`,
    imei,
    rtcUtc,
    statusDataLength: statusLen,
    alarmType: alarm,
    terminalInfo,
    wifiSignalDbm,
    wifiState,
    batteryRaw,
    batteryVolts: Number(batteryVolts.toFixed(2)),
    batteryPercent: Number(batteryPercent.toFixed(0)),
    tempSensorAbnormal,
    tempNegative,
    temperatureC:
      temperatureC !== null ? Number(temperatureC.toFixed(1)) : null,
    humSensorAbnormal,
    humidityRh: humidityRh !== null ? Number(humidityRh.toFixed(1)) : null,
    packetIndex,
    crc: crcFromPacket,
    // Terminal info bits
    buttonPressed: (terminalInfo & (1 << 4)) !== 0,
    tempHumSensorAbnormalFlag: (terminalInfo & (1 << 3)) !== 0,
    overThresholdFlag: (terminalInfo & (1 << 2)) !== 0,
    lowBatteryFlag: (terminalInfo & (1 << 1)) !== 0,
    chargingFlag: (terminalInfo & (1 << 0)) !== 0,
  };

  return { success: true, packet, error: null };
}

/**
 * Check if frame is a valid WF501 frame (starts with TZ, ends with 0D0A)
 * @param {Buffer} buffer - Data buffer
 * @returns {boolean}
 */
export function isValidWf501Frame(buffer) {
  if (buffer.length < 8) return false;
  // Check TZ header
  if (buffer[0] !== 0x54 || buffer[1] !== 0x5a) return false;
  // Check 0D0A trailer
  if (buffer[buffer.length - 2] !== 0x0d || buffer[buffer.length - 1] !== 0x0a)
    return false;
  return true;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use parseWf501Packet instead
 */
export function parseHexPacket(buffer) {
  const result = parseWf501Packet(buffer);
  if (result.success && result.packet) {
    return {
      imei: result.packet.imei,
      temperature: result.packet.temperatureC,
      humidity: result.packet.humidityRh,
      voltage: result.packet.batteryVolts,
      packetIndex: result.packet.packetIndex,
    };
  }
  return {
    imei: null,
    temperature: null,
    humidity: null,
    voltage: null,
    packetIndex: null,
  };
}

// Legacy exports for backward compatibility
export function extractIMEI(buffer) {
  const result = parseWf501Packet(buffer);
  return result.success ? result.packet.imei : null;
}

export function parseTemperature(buffer) {
  const result = parseWf501Packet(buffer);
  return result.success ? result.packet.temperatureC : null;
}

export function parseHumidity(buffer) {
  const result = parseWf501Packet(buffer);
  return result.success ? result.packet.humidityRh : null;
}

export function parseVoltage(buffer) {
  const result = parseWf501Packet(buffer);
  return result.success ? result.packet.batteryVolts : null;
}

export function getPacketIndex(buffer) {
  const result = parseWf501Packet(buffer);
  return result.success ? result.packet.packetIndex : null;
}
