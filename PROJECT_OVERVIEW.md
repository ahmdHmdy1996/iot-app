# Project Overview: IoT Temperature Monitoring Backend

This document provides a comprehensive overview of the backend system for the IoT Temperature Monitoring platform.

## 1. Architecture & Tech Stack

The backend is built as a **Node.js** application following a modular architecture, combining a **REST API** for management and a **TCP Server** for real-time data ingestion.

- **Runtime**: Node.js (ES Modules)
- **Web Framework**: Express.js
- **TCP Server**: Native Node.js `net` module for handling WF501 IoT device connections.
- **ORM**: Prisma
- **Database**: PostgreSQL (configured via `DATABASE_URL`)
- **Authentication**: JWT (JSON Web Tokens) with `bcryptjs` for password hashing.
- **Task Scheduling**: `node-cron` for periodic jobs (e.g., offline device detection).
- **Notifications**: `nodemailer` for Email and a WhatsApp integration utility.
- **Date Handling**: `moment.js`

### Design Patterns
- **Service Layer Pattern**: Business logic is encapsulated in service files (`src/services`).
- **Controller-Route Pattern**: Express routes handle requests and delegate to controllers.
- **Event-Driven Ingestion**: The TCP server processes raw hex packets asynchronously.

---

## 2. Database Schema

The database uses PostgreSQL, managed via Prisma. The primary entities and relationships are:

- **User**: Stores credentials, roles (ADMIN/CLIENT), plan types (BASIC/PRO), and notification preferences.
  - *Relationship*: One-to-Many with `Device`.
- **Device**: Represents a physical hardware unit identified by IMEI. Stores calibration offsets, alert thresholds (`minTemp`, `maxTemp`), and current status (battery, online/offline).
  - *Relationship*: Many-to-One with `User`, One-to-Many with `Reading` and `AlertLog`.
- **Reading**: Immutable logs of temperature, humidity, and voltage received from devices.
- **AlertLog**: Records of triggered events (High/Low Temp, Offline, Low Battery).
- **SystemSettings**: Global configuration for the platform (SMTP, support email, retention policies).

---

## 3. Core Workflows

### Data Ingestion & Processing
1. **TCP Connection**: A device connects to the TCP server. The server immediately sends a UTC sync message (`@UTC...#`).
2. **Frame Extraction**: The server buffers incoming bytes and identifies valid WF501 frames starting with `TZ`.
3. **Parsing**: `HexParser.js` decodes the hex payload into metrics (Temperature, Battery, etc.).
4. **Validation & Calibration**:
   - The device IMEI is verified against the database.
   - A `calibrationOffset` is applied to the raw temperature reading.
5. **Persistence**: The calibrated reading is saved to the `Reading` table.

### Alerting & Notifications
1. **Threshold Check**: The system compares the new reading against the device's `minTemp` and `maxTemp`.
2. **Deduplication**: Alerts only fire on **state transitions** (e.g., from NORMAL to TEMPERATURE_HIGH). This prevents notification spam.
3. **Logging**: If a transition occurs, an `AlertLog` entry is created.
4. **Notification**: The system sends an Email or WhatsApp message based on user preferences.
5. **Webhook**: If a `webhookUrl` is configured, a real-time payload is POSTed to the external system.
6. **Acknowledgement**: The server sends an `@ACK...#` message back to the hardware.

---

## 4. API Endpoints

### Authentication
- `POST /auth/login`: User authentication.

### Device Management (`/api/my-devices`)
- `GET /`: List all devices belonging to the user.
- `POST /add`: Register a new device by IMEI.
- `PATCH /:imei`: Update device settings (thresholds, names, calibration).
- `DELETE /:imei`: Unlink a device.

### Monitoring & Data
- `GET /api/readings/:imei`: Retrieve historical temperature data.
- `GET /api/alerts`: List recent alerts.
- `GET /api/devices/stats`: Dashboard summary statistics.

### Administration
- `GET /api/users`: (Admin only) Manage platform users.
- `GET /admin/settings`: View/Update system-wide settings.

---

## 5. Project Structure

```text
iot-backend/
├── prisma/               # Database schema and migrations
├── src/
│   ├── tcp/              # TCP Server logic & Hex packet parsing
│   ├── services/         # Core business logic (Alerts, Readings, Users)
│   ├── controllers/      # Request handlers for API endpoints
│   ├── routes/           # API route definitions
│   ├── middlewares/      # Auth, Role-based access, and Error handling
│   ├── utils/            # Helper functions (Notifications, Webhooks)
│   ├── config/           # Database and Environment configuration
│   ├── app.js            # Express app setup
│   └── server.js         # Entry point (Starts both HTTP and TCP servers)
└── tests/                # Testing scripts
```

---

## 6. Code Quality & Current State

### Observations
- **Robust Ingestion**: The TCP server handles buffering and frame extraction well, which is critical for raw socket communication.
- **Smart Alerting**: Deduplication logic is a highlight, ensuring users aren't overwhelmed by notifications.
- **Security**: Basic JWT implementation is solid, but the "allow-all" CORS policy needs narrowing for production.

### Recommended Refactoring
- **Protocol/Business Logic Separation**: Move database and notification logic out of `TCPServer.js` and into dedicated services. This makes the TCP protocol handler easier to test in isolation.
- **Reliability**: Add a retry mechanism or queue for webhooks and notifications to handle transient network failures.
- **Validation**: Integrate a schema validation library (like `Zod`) in the API controllers to handle edge cases in user input.
- **Logging**: Transition from `console.log` to a structured logger (e.g., `Winston`) to facilitate better log analysis.
