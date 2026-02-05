# IoT Temperature Monitoring Backend

Backend server for WF501 IoT temperature sensors with TCP data collection and REST API.

## Features

- **TCP Server**: Receives hex data from WF501 devices on configurable port
- **Device Management**: Admin API for registering and managing devices
- **REST API**: Secure endpoints for frontend dashboard access
- **MongoDB Storage**: Persistent storage for device metadata and readings
- **API Key Authentication**: Device-specific API keys for secure access

## Installation

### Prerequisites

- Node.js 18+
- MongoDB (local or remote)

### Setup

1. **Install dependencies:**

```bash
cd iot-backend
npm install
```

2. **Configure environment:**

```bash
cp .env.example .env
```

Edit `.env` file:

```env
MONGODB_URI=mongodb://localhost:27017/iot-monitoring
HTTP_PORT=3000
TCP_PORT=8899
NODE_ENV=development
```

3. **Start MongoDB:**

```bash
# If using local MongoDB
mongod
```

4. **Start server:**

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Documentation

### Admin Endpoints

#### Create Device

```http
POST /admin/devices
Content-Type: application/json

{
  "imei": "865421050012345",
  "name": "Main Kitchen Fridge"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Device created successfully.",
  "device": {
    "imei": "865421050012345",
    "name": "Main Kitchen Fridge",
    "apiKey": "550e8400-e29b-41d4-a716-446655440000",
    "isActive": true,
    "createdAt": "2025-12-29T20:00:00.000Z"
  }
}
```

#### List All Devices

```http
GET /admin/devices
```

#### Toggle Device Status

```http
PATCH /admin/devices/:imei/status
Content-Type: application/json

{
  "isActive": false
}
```

---

### Device API Endpoints

All endpoints require `x-api-key` header.

#### Get Current Status

```http
GET /api/readings/current
x-api-key: 550e8400-e29b-41d4-a716-446655440000
```

**Response:**

```json
{
  "success": true,
  "device_name": "Main Kitchen Fridge",
  "imei": "865421050012345",
  "status": {
    "temperature": -18.5,
    "humidity": 60.2,
    "voltage": 3.89,
    "is_online": true
  },
  "last_updated": "2025-12-29T20:15:00.000Z"
}
```

#### Get Historical Data

```http
GET /api/readings/history?limit=50
x-api-key: 550e8400-e29b-41d4-a716-446655440000
```

**Response:**

```json
{
  "success": true,
  "count": 50,
  "readings": [
    {
      "timestamp": "2025-12-29T19:00:00.000Z",
      "temperature": -18.5,
      "humidity": 60.2
    },
    ...
  ]
}
```

#### Get Statistics

```http
GET /api/readings/stats?hours=24
x-api-key: 550e8400-e29b-41d4-a716-446655440000
```

## TCP Protocol

### Device Connection Flow

1. **Device connects** to TCP server
2. **Server sends sync message**: `@UTC,2025-12-29 20:15:00#`
3. **Device sends hex packet** with temperature data
4. **Server validates** device IMEI against database
5. **Server parses** hex data and saves to MongoDB
6. **Server responds** with ACK: `@ACK,{packetIndex}#`

### Hex Packet Format

- **Bytes 4-11**: IMEI
- **Bytes 8-9**: Packet Index
- **Bytes 32-33**: Voltage (multiply by 0.01)
- **Bytes 34-35**: Temperature (multiply by 0.1, check bit 14 for sign)
- **Bytes 36-37**: Humidity (multiply by 0.1)

## Testing

### Test TCP Server

```bash
# Make sure server is running first
npm test
```

This will:

1. Connect to TCP server
2. Receive sync message
3. Send sample hex packet
4. Receive ACK response

### Test API with curl

```bash
# Health check
curl http://localhost:3000/health

# Create device
curl -X POST http://localhost:3000/admin/devices \
  -H "Content-Type: application/json" \
  -d '{"imei":"865421050012345","name":"Test Device"}'

# Get current reading
curl http://localhost:3000/api/readings/current \
  -H "x-api-key: YOUR_API_KEY"
```

## Project Structure

```
iot-backend/
├── src/
│   ├── models/
│   │   ├── Device.js          # Device schema
│   │   └── Reading.js         # Reading schema
│   ├── tcp/
│   │   ├── TCPServer.js       # TCP server for WF501 devices
│   │   └── HexParser.js       # Hex data parsing utilities
│   ├── routes/
│   │   ├── admin.js           # Admin management endpoints
│   │   └── api.js             # Device API endpoints
│   ├── middleware/
│   │   └── apiKeyAuth.js      # API key authentication
│   ├── app.js                 # Express application
│   └── server.js              # Server entry point
├── tests/
│   └── send-test-packet.js    # TCP testing script
├── package.json
├── .env.example
└── .gitignore
```

## Database Schema

### Device Collection

```javascript
{
  imei: String,        // Unique device identifier
  name: String,        // Human-readable name
  apiKey: String,      // UUID for API access
  isActive: Boolean,   // Service status
  createdAt: Date      // Registration date
}
```

### Reading Collection

```javascript
{
  deviceImei: String,  // Reference to device
  temperature: Number, // Celsius
  humidity: Number,    // Percentage
  voltage: Number,     // Battery voltage
  packetIndex: Number, // Sequence number
  timestamp: Date      // Reading time
}
```

## Troubleshooting

### TCP Connection Issues

- Ensure TCP port is not blocked by firewall
- Check device is configured with correct server IP and port
- Verify MongoDB is running

### API Authentication Errors

- Verify API key is correct
- Check device is marked as active in database
- Ensure `x-api-key` header is included

### No Data Received

- Check device IMEI is registered in database
- Verify hex parsing matches WF501 protocol
- Review server logs for connection attempts

## License

ISC
