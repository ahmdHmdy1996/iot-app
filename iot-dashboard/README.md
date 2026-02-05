# IoT Temperature Monitoring Dashboard

React-based dashboard for real-time temperature monitoring of restaurant equipment.

## Features

- **Live Monitor**: Real-time device status with auto-refresh (60s)
- **Historical Data**: Charts and data tables for trend analysis
- **Export**: Excel and PDF export functionality
- **Alerts**: Color-coded temperature warnings and critical alerts
- **Offline Detection**: Automatic offline status detection (10min threshold)
- **Arabic Support**: Full RTL support with Arabic interface

## Installation

### Prerequisites

- Node.js 18+
- Backend API running (see `iot-backend/`)

### Setup

1. **Install dependencies:**

```bash
cd iot-dashboard
npm install
```

2. **Configure environment:**

```bash
cp .env.example .env
```

Edit `.env` file:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_API_KEY=your-device-api-key-here
```

**Important**: Get your API key by registering a device via the backend admin endpoint.

3. **Start development server:**

```bash
npm run dev
```

The dashboard will open at `http://localhost:5173`

4. **Build for production:**

```bash
npm run build
```

## Usage

### Getting Your API Key

Before using the dashboard, you need to register your device:

```bash
curl -X POST http://localhost:3000/admin/devices \
  -H "Content-Type: application/json" \
  -d '{"imei":"865421050012345","name":"Main Kitchen Fridge"}'
```

Response will include your `apiKey`. Copy it to `.env` file.

### Pages

#### 1. Live Monitor (/)

- Shows current device status
- Temperature, humidity, and battery level
- Auto-refreshes every 60 seconds
- Color-coded alerts:
  - 🟢 Green: Normal (≤ 10°C)
  - 🟡 Orange: Warning (> 10°C)
  - 🔴 Red: Critical (> 15°C)
  - ⚫ Gray: Offline

#### 2. History & Analytics (/history)

- Line chart showing temperature/humidity trends
- Data table with all readings
- Export to Excel or PDF
- Configurable data range (10, 50, 100, 500 readings)

## Configuration

### Temperature Thresholds

Edit `src/config/constants.js`:

```javascript
export const TEMP_WARNING_THRESHOLD = 10; // °C
export const TEMP_CRITICAL_THRESHOLD = 15; // °C
```

### Refresh Interval

```javascript
export const REFRESH_INTERVAL = 60000; // 60 seconds
```

### Offline Detection

```javascript
export const OFFLINE_THRESHOLD = 600000; // 10 minutes
```

## Project Structure

```
iot-dashboard/
├── src/
│   ├── pages/
│   │   ├── LiveMonitor.jsx      # Live monitoring dashboard
│   │   └── History.jsx          # Historical data & charts
│   ├── components/
│   │   └── StatusCard.jsx       # Device status card component
│   ├── services/
│   │   └── api.js               # API service with axios
│   ├── config/
│   │   └── constants.js         # App configuration
│   ├── App.jsx                  # Main app with routing
│   ├── App.css                  # Global styles
│   └── main.jsx                 # Entry point
├── public/                      # Static assets
├── index.html                   # HTML template
├── vite.config.js              # Vite configuration
├── package.json
└── .env.example
```

## API Integration

The dashboard communicates with the backend via REST API:

### Authentication

All requests include `x-api-key` header automatically.

### Endpoints Used

1. **GET /api/readings/current**

   - Fetches latest device status
   - Auto-refresh: every 60s

2. **GET /api/readings/history?limit=50**

   - Fetches historical readings
   - Used for charts and tables

3. **GET /api/readings/stats?hours=24**
   - Fetches statistics (optional)
   - For analytics features

## Troubleshooting

### "API key is required"

- Ensure `.env` file exists with correct `VITE_API_KEY`
- Make sure to restart dev server after editing `.env`

### "No response from server"

- Verify backend is running on correct port
- Check `VITE_API_BASE_URL` in `.env`
- Ensure CORS is enabled on backend

### Device shows as "Offline"

- Device hasn't sent data in last 10 minutes
- Check backend TCP server logs
- Verify device is connected and sending data

### Chart not showing

- Ensure there are at least 2 data points
- Check browser console for errors
- Verify data format from API

## Development

### Adding New Features

1. **New Page**: Create component in `src/pages/`
2. **Add Route**: Update `src/App.jsx`
3. **Add Menu Item**: Update menu items in `App.jsx`

### Environment Variables

All environment variables must be prefixed with `VITE_`:

```env
VITE_YOUR_VARIABLE=value
```

Access in code:

```javascript
import.meta.env.VITE_YOUR_VARIABLE;
```

## License

ISC
