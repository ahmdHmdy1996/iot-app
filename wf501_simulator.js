const net = require('net');

/**
 * Enhanced WF501 IoT Device Simulator
 * ----------------------------------
 * Simulates state transitions (Normal -> High) to bypass alert deduplication
 * and verify webhook triggering.
 */

// CONFIGURATION
const HOST = '127.0.0.1';
const PORT = 8900;
const IMEI_STR = '0865421050012500'; // Ensure this matches your registered device

// 1. CRC-16/MODBUS calculation
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

// 2. BCD Encoding
function digitsToBcd(digits) {
    const buffer = Buffer.alloc(digits.length / 2);
    for (let i = 0; i < digits.length; i += 2) {
        const byte = parseInt(digits[i], 10) << 4 | parseInt(digits[i + 1], 10);
        buffer[i / 2] = byte;
    }
    return buffer;
}

const client = new net.Socket();

client.connect(PORT, HOST, () => {
    console.log('[Simulator] Connected to server.');
});

client.on('data', (data) => {
    const message = data.toString();
    console.log(`[Simulator] Received: ${message}`);

    if (message.startsWith('@UTC')) {
        console.log('[Simulator] Handshake detected. Starting state transition test...');
        
        // Step 1: Send Normal Temperature (5°C)
        console.log('\n--- Step 1: Sending NORMAL temperature (5°C) to reset state ---');
        sendDataPacket(50, 1); // 50 * 0.1 = 5.0°C
        
        // Step 2: Send High Temperature (35°C) after 3 seconds
        setTimeout(() => {
            console.log('\n--- Step 2: Sending HIGH temperature (35°C) to trigger alert ---');
            sendDataPacket(350, 2); // 350 * 0.1 = 35.0°C
        }, 3000);
    }

    if (message.startsWith('@ACK')) {
        console.log('[Simulator] Server acknowledged packet.');
    }
});

function sendDataPacket(tempRawValue, index) {
    const protocol = Buffer.from([0x24, 0x24]); // '$$'
    const hardwareType = Buffer.from([0x00, 0x01]);
    const firmware = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    const imei = digitsToBcd(IMEI_STR);
    
    const now = new Date();
    const rtc = Buffer.from([
        now.getUTCFullYear() % 100,
        now.getUTCMonth() + 1,
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
    ]);

    const statusLen = Buffer.from([0x00, 0x0a]);
    
    // Status Data
    const statusData = Buffer.alloc(10);
    statusData[0] = 0x00; // Alarm
    statusData[1] = 0x00; // Terminal Info
    statusData[2] = 0x1e; // WiFi Signal
    statusData[3] = 0x01; // WiFi State
    statusData.writeUInt16BE(410, 4);      // 4.10V
    statusData.writeUInt16BE(tempRawValue, 6); // Temperature (Input)
    statusData.writeUInt16BE(450, 8);      // 45% Humidity

    const packetIndex = Buffer.alloc(2);
    packetIndex.writeUInt16BE(index, 0);

    const payload = Buffer.concat([
        protocol, hardwareType, firmware, imei, rtc, statusLen, statusData, packetIndex
    ]);

    const crcVal = crc16Modbus(payload);
    const crcBuf = Buffer.alloc(2);
    crcBuf.writeUInt16BE(crcVal, 0);

    const frame = Buffer.concat([
        Buffer.from([0x54, 0x5a]), // 'TZ'
        (() => { 
            const b = Buffer.alloc(2); 
            b.writeUInt16BE(payload.length + 2, 0); 
            return b; 
        })(),
        payload,
        crcBuf,
        Buffer.from([0x0d, 0x0a]) // Stop
    ]);

    console.log(`[Simulator] Sending Packet #${index} | Temp: ${tempRawValue/10}°C | Hex: ${frame.toString('hex').toUpperCase()}`);
    client.write(frame);
}

client.on('error', (err) => console.error(`[Simulator] Error: ${err.message}`));
client.on('close', () => console.log('[Simulator] Connection closed.'));
