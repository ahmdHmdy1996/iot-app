import net from "net";

/**
 * Test script to send sample hex data to TCP server
 * This simulates a WF501 device sending temperature data
 */

const TCP_HOST = "localhost";
const TCP_PORT = 8899;

// Sample hex packet (you'll need to adjust this based on actual WF501 protocol)
// This is a placeholder - replace with actual hex format
const SAMPLE_HEX_PACKET = Buffer.from([
  0x24,
  0x24, // Start marker
  0x00,
  0x2e, // Length
  // IMEI (bytes 4-11) - example: 8654210500XXXXX
  0x38,
  0x36,
  0x35,
  0x34,
  0x32,
  0x31,
  0x30,
  0x35,
  // ... filler bytes ...
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  // Packet index (bytes 8-9)
  0x00,
  0x01,
  // More filler
  0x00,
  0x00,
  0x00,
  // Voltage bytes 32-33 (3.89V = 389 * 0.01)
  0x01,
  0x85, // 389 in hex
  // Temperature bytes 34-35 (-18.5°C = 185 * 0.1, negative flag in bit 14)
  0x40,
  0xb9, // 185 with negative bit
  // Humidity bytes 36-37 (60.2% = 602 * 0.1)
  0x02,
  0x5a, // 602 in hex
  // End marker
  0x0d,
  0x0a,
]);

const client = new net.Socket();

client.connect(TCP_PORT, TCP_HOST, () => {
  console.log("Connected to TCP server");
  console.log("Waiting for sync message...");
});

client.on("data", (data) => {
  const message = data.toString();
  console.log("Received from server:", message);

  if (message.startsWith("@UTC")) {
    console.log("Sync message received, sending sample hex data...");
    console.log("Hex packet:", SAMPLE_HEX_PACKET.toString("hex"));

    // Send sample packet
    client.write(SAMPLE_HEX_PACKET);
  } else if (message.startsWith("@ACK")) {
    console.log("ACK received - data was processed successfully!");
    console.log("Closing connection...");
    client.destroy();
  }
});

client.on("error", (error) => {
  console.error("Connection error:", error.message);
});

client.on("close", () => {
  console.log("Connection closed");
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log("Timeout - closing connection");
  client.destroy();
}, 10000);
