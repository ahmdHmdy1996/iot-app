/**
 * WF501 Hex Data Parser
 * Parses hex packets from WF501 temperature sensors according to protocol specification
 */

/**
 * Extract IMEI from hex buffer
 * @param {Buffer} buffer - Hex data buffer
 * @returns {string|null} IMEI or null if extraction fails
 */
export function extractIMEI(buffer) {
  try {
    // IMEI typically starts at a specific byte position
    // Adjust based on actual WF501 protocol specification
    // This is a placeholder - needs actual protocol details
    const imeiBytes = buffer.slice(4, 12); // Example: bytes 4-11
    return imeiBytes.toString("hex");
  } catch (error) {
    console.error("Error extracting IMEI:", error);
    return null;
  }
}

/**
 * Parse temperature from hex buffer
 * Bytes 34-35: Temperature value
 * Multiply by 0.1 for actual value
 * Check bit 14 for sign (negative/positive)
 *
 * @param {Buffer} buffer - Hex data buffer
 * @returns {number|null} Temperature in Celsius
 */
export function parseTemperature(buffer) {
  try {
    if (buffer.length < 36) {
      console.error("Buffer too short for temperature parsing");
      return null;
    }

    // Read bytes 34-35 (0-indexed: 33-34)
    const byte34 = buffer[33];
    const byte35 = buffer[34];

    // Combine bytes to get raw value
    const rawValue = (byte34 << 8) | byte35;

    // Check bit 14 for sign (0x4000 = bit 14)
    const isNegative = (rawValue & 0x4000) !== 0;

    // Mask out the sign bit to get actual value
    const absoluteValue = rawValue & 0x3fff;

    // Convert to temperature (multiply by 0.1)
    let temperature = absoluteValue * 0.1;

    // Apply sign
    if (isNegative) {
      temperature = -temperature;
    }

    return Number(temperature.toFixed(1));
  } catch (error) {
    console.error("Error parsing temperature:", error);
    return null;
  }
}

/**
 * Parse humidity from hex buffer
 * Bytes 36-37: Humidity value
 * Multiply by 0.1 for actual value
 *
 * @param {Buffer} buffer - Hex data buffer
 * @returns {number|null} Humidity in percentage
 */
export function parseHumidity(buffer) {
  try {
    if (buffer.length < 38) {
      console.error("Buffer too short for humidity parsing");
      return null;
    }

    // Read bytes 36-37 (0-indexed: 35-36)
    const byte36 = buffer[35];
    const byte37 = buffer[36];

    // Combine bytes to get raw value
    const rawValue = (byte36 << 8) | byte37;

    // Convert to humidity (multiply by 0.1)
    const humidity = rawValue * 0.1;

    return Number(humidity.toFixed(1));
  } catch (error) {
    console.error("Error parsing humidity:", error);
    return null;
  }
}

/**
 * Parse battery voltage from hex buffer
 * Bytes 32-33: Voltage value
 * Multiply by 0.01 for actual voltage
 *
 * @param {Buffer} buffer - Hex data buffer
 * @returns {number|null} Voltage in volts
 */
export function parseVoltage(buffer) {
  try {
    if (buffer.length < 34) {
      console.error("Buffer too short for voltage parsing");
      return null;
    }

    // Read bytes 32-33 (0-indexed: 31-32)
    const byte32 = buffer[31];
    const byte33 = buffer[32];

    // Combine bytes to get raw value
    const rawValue = (byte32 << 8) | byte33;

    // Convert to voltage (multiply by 0.01)
    const voltage = rawValue * 0.01;

    return Number(voltage.toFixed(2));
  } catch (error) {
    console.error("Error parsing voltage:", error);
    return null;
  }
}

/**
 * Extract packet index for ACK response
 * @param {Buffer} buffer - Hex data buffer
 * @returns {number|null} Packet index
 */
export function getPacketIndex(buffer) {
  try {
    // Packet index location depends on protocol
    // This is a placeholder - adjust based on actual WF501 protocol
    if (buffer.length < 10) {
      return null;
    }

    // Example: assume packet index at bytes 8-9
    const byte8 = buffer[7];
    const byte9 = buffer[8];

    const packetIndex = (byte8 << 8) | byte9;

    return packetIndex;
  } catch (error) {
    console.error("Error extracting packet index:", error);
    return null;
  }
}

/**
 * Parse complete hex packet
 * @param {Buffer} buffer - Hex data buffer
 * @returns {Object} Parsed data object
 */
export function parseHexPacket(buffer) {
  return {
    imei: extractIMEI(buffer),
    temperature: parseTemperature(buffer),
    humidity: parseHumidity(buffer),
    voltage: parseVoltage(buffer),
    packetIndex: getPacketIndex(buffer),
  };
}
