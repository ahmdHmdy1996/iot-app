# IoT Temperature Monitoring System

Complete IoT platform for restaurant temperature monitoring with WF501 sensors.

## System Overview

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  WF501      │      │   Backend        │      │   Frontend      │
│  Sensor     │─────▶│   Node.js        │◀─────│   React         │
│             │ TCP  │   MongoDB        │ HTTP │   Dashboard     │
└─────────────┘      └──────────────────┘      └─────────────────┘
```

## Projects

### 1. Backend (`iot-backend/`)

Node.js server with:

- TCP server for WF501 devices (port 8899)
- REST API for dashboard (port 3000)
- MongoDB for data storage
- API key authentication

[📖 Backend Documentation](./iot-backend/README.md)

### 2. Frontend (`iot-dashboard/`)

React dashboard with:

- Live monitoring with auto-refresh
- Historical data charts
- Excel/PDF export
- Arabic RTL interface

[📖 Frontend Documentation](./iot-dashboard/README.md)

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- WF501 temperature sensor (optional for testing)

### 1. Setup Backend

```bash
cd iot-backend
npm install
cp .env.example .env
# Edit .env with your MongoDB connection
npm start
```

Backend will start on:

- HTTP API: `http://localhost:3000`
- TCP Server: Port `8899`

### 2. Register Device

```bash
curl -X POST http://localhost:3000/admin/devices \
  -H "Content-Type: application/json" \
  -d '{
    "imei": "865421050012345",
    "name": "Main Kitchen Fridge"
  }'
```

**Save the API key** from the response!

### 3. Setup Frontend

```bash
cd iot-dashboard
npm install
cp .env.example .env
# Edit .env and add your API key
npm run dev
```

Dashboard will open at `http://localhost:5173`

## System Workflow

1. **Device Registration**

   - Admin registers device IMEI via API
   - System generates unique API key

2. **Device Installation**

   - Configure WF501 with server IP and port (8899)
   - Device connects and syncs time

3. **Data Collection**

   - Device sends temperature data every minute (configurable)
   - Backend parses hex data and stores in MongoDB
   - Backend sends ACK response

4. **Data Visualization**
   - Dashboard polls API every 60 seconds
   - Displays current status with color-coded alerts
   - Shows historical trends in charts

## API Endpoints

### Admin (Backend Only)

```http
POST /admin/devices              # Register new device
GET /admin/devices               # List all devices
PATCH /admin/devices/:imei/status # Toggle device status
```

### Device API (Requires x-api-key)

```http
GET /api/readings/current        # Latest reading
GET /api/readings/history        # Historical data
GET /api/readings/stats          # Statistics
```

## TCP Protocol (WF501)

### Connection Flow

1. Device connects → Server sends: `@UTC,2025-12-29 20:15:00#`
2. Device sends hex packet with data
3. Server validates IMEI and parses data
4. Server responds: `@ACK,{packetIndex}#`

### Hex Packet Format

- Bytes 4-11: IMEI
- Bytes 32-33: Voltage (× 0.01)
- Bytes 34-35: Temperature (× 0.1)
- Bytes 36-37: Humidity (× 0.1)

## Testing

### Test Backend TCP Server

```bash
cd iot-backend
npm test
```

### Test API with curl

```bash
# Health check
curl http://localhost:3000/health

# Get current reading
curl http://localhost:3000/api/readings/current \
  -H "x-api-key: YOUR_API_KEY"
```

## Deployment

### Backend Deployment

1. **Environment Variables:**

```env
MONGODB_URI=mongodb://your-production-db/iot
HTTP_PORT=3000
TCP_PORT=8899
NODE_ENV=production
```

2. **Start with PM2:**

```bash
npm install -g pm2
pm2 start src/server.js --name iot-backend
pm2 save
pm2 startup
```

3. **Firewall Configuration:**

- Open port 3000 (HTTP API)
- Open port 8899 (TCP devices)

### Frontend Deployment

1. **Build:**

```bash
cd iot-dashboard
npm run build
```

2. **Deploy `dist/` folder to:**

- Nginx
- Apache
- Vercel
- Netlify

3. **Configure `.env` for production:**

```env
VITE_API_BASE_URL=https://your-backend-domain.com
VITE_API_KEY=your-production-api-key
```

## Security Considerations

- ✅ Use HTTPS in production
- ✅ Keep API keys secret
- ✅ Use strong MongoDB authentication
- ✅ Implement rate limiting on API
- ✅ Regular security updates
- ✅ Monitor unauthorized connection attempts

## Support & Troubleshooting

### Common Issues

**Device not connecting:**

- Check firewall rules
- Verify TCP port is correct
- Ensure device has internet connection

**No data in dashboard:**

- Verify API key is correct
- Check backend logs
- Ensure device IMEI is registered

**Dashboard shows offline:**

- Device hasn't sent data in 10+ minutes
- Check TCP server logs
- Verify device power and connection

## License

ISC

## Project Structure

```
.
├── iot-backend/           # Node.js Backend
│   ├── src/
│   │   ├── models/       # MongoDB schemas
│   │   ├── tcp/          # TCP server & parser
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Auth middleware
│   │   ├── app.js        # Express app
│   │   └── server.js     # Entry point
│   └── tests/
│
├── iot-dashboard/        # React Frontend
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── components/   # Reusable components
│   │   ├── services/     # API service
│   │   ├── config/       # Configuration
│   │   └── App.jsx       # Main app
│   └── public/
│
└── README.md             # This file
```
