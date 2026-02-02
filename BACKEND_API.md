# RawdahScope Backend API Documentation

This document describes the REST API endpoints for the RawdahScope environmental monitoring system.

## API Overview

**Base URL**: `http://your-server.com/api/v1`

**Authentication**: JWT Bearer Token (optional for public read endpoints)

**Content-Type**: `application/json`

---

## Technology Stack Recommendations

### Backend Framework Options:
- **Node.js** with Express.js (JavaScript/TypeScript)
- **Python** with FastAPI or Flask
- **PHP** with Laravel
- **Java** with Spring Boot

### Example Stack:
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL or MySQL
- **ORM**: Sequelize (Node.js) or Prisma
- **Authentication**: JWT (jsonwebtoken)
- **API Documentation**: Swagger/OpenAPI

---

## API Endpoints

### 1. Sensors

#### GET `/sensors`
Get list of all sensors.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "PSU-N001",
      "name": "PSU Campus - North Zone",
      "location": "North Zone",
      "district": "Prince Sultan University",
      "afforestation_status": "Afforested",
      "station_type": "Node/Gateway",
      "coordinates": {
        "latitude": 24.73700000,
        "longitude": 46.70100000
      },
      "status": "Active",
      "battery_level": 95,
      "last_reading": "2025-01-15T10:30:00Z"
    }
  ],
  "count": 3
}
```

#### GET `/sensors/:id`
Get detailed information about a specific sensor.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "PSU-N001",
    "name": "PSU Campus - North Zone",
    "location": "North Zone",
    "district": "Prince Sultan University",
    "afforestation_status": "Afforested",
    "station_type": "Node/Gateway",
    "sensor_types": "MH-Z19B, MLX90614, DS18B20, SHT30 + LoRaWAN Gateway",
    "coordinates": {
      "latitude": 24.73700000,
      "longitude": 46.70100000
    },
    "installation_date": "2025-01-01",
    "status": "Active",
    "battery_level": 95,
    "firmware_version": "1.2.0",
    "last_maintenance": "2025-01-10",
    "total_readings": 15234,
    "last_reading": "2025-01-15T10:30:00Z"
  }
}
```

#### POST `/sensors`
Register a new sensor (Admin only).

**Request:**
```json
{
  "id": "PSU-N004",
  "name": "PSU Campus - East Zone",
  "location": "East Zone",
  "district": "Prince Sultan University",
  "afforestation_status": "Afforested",
  "station_type": "Node",
  "sensor_types": "MH-Z19B, MLX90614, DS18B20, SHT30",
  "latitude": 24.73650,
  "longitude": 46.70300,
  "installation_date": "2025-01-15"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sensor registered successfully",
  "data": {
    "id": "PSU-N004",
    ...
  }
}
```

#### PUT `/sensors/:id`
Update sensor information (Admin only).

#### DELETE `/sensors/:id`
Deactivate a sensor (Admin only).

---

### 2. Sensor Readings

#### GET `/readings`
Get recent sensor readings with optional filters.

**Query Parameters:**
- `sensor_id` (optional): Filter by specific sensor
- `from` (optional): Start timestamp (ISO 8601)
- `to` (optional): End timestamp (ISO 8601)
- `limit` (optional): Number of records (default: 100, max: 1000)
- `quality` (optional): Filter by data quality (Good/Fair/Poor)

**Example Request:**
```
GET /api/v1/readings?sensor_id=PSU-N001&from=2025-01-15T00:00:00Z&to=2025-01-15T23:59:59Z&limit=100
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123456,
      "sensor_id": "PSU-N001",
      "timestamp": "2025-01-15T10:30:00Z",
      "co2_ppm": 415.5,
      "air_temperature": 28.3,
      "surface_temperature": 32.5,
      "humidity": 45.2,
      "pm25": null,
      "pm10": null,
      "rssi": -75,
      "battery_voltage": 3.7,
      "data_quality": "Good"
    }
  ],
  "count": 1,
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 1
  }
}
```

#### POST `/readings`
Submit new sensor reading (from sensor nodes).

**Request:**
```json
{
  "sensor_id": "PSU-N001",
  "timestamp": "2025-01-15T10:30:00Z",
  "co2_ppm": 415.5,
  "air_temperature": 28.3,
  "surface_temperature": 32.5,
  "humidity": 45.2,
  "rssi": -75,
  "battery_voltage": 3.7
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reading recorded successfully",
  "data": {
    "id": 123456,
    "sensor_id": "PSU-N001",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

#### POST `/readings/bulk`
Submit multiple readings at once (batch upload).

**Request:**
```json
{
  "readings": [
    {
      "sensor_id": "PSU-N001",
      "timestamp": "2025-01-15T10:30:00Z",
      "co2_ppm": 415.5,
      "air_temperature": 28.3,
      "surface_temperature": 32.5,
      "humidity": 45.2
    },
    {
      "sensor_id": "PSU-N002",
      "timestamp": "2025-01-15T10:30:00Z",
      "co2_ppm": 450.2,
      "air_temperature": 32.5,
      "surface_temperature": 38.7,
      "humidity": 38.5
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk readings recorded",
  "data": {
    "inserted": 2,
    "failed": 0
  }
}
```

---

### 3. Daily Aggregates

#### GET `/aggregates/daily`
Get daily aggregated statistics.

**Query Parameters:**
- `sensor_id` (optional): Filter by specific sensor
- `from` (date): Start date (YYYY-MM-DD)
- `to` (date): End date (YYYY-MM-DD)

**Example Request:**
```
GET /api/v1/aggregates/daily?sensor_id=PSU-N001&from=2025-01-01&to=2025-01-15
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "sensor_id": "PSU-N001",
      "date": "2025-01-15",
      "co2": {
        "avg": 415.5,
        "min": 390.2,
        "max": 445.8
      },
      "air_temperature": {
        "avg": 28.3,
        "min": 22.1,
        "max": 35.7
      },
      "surface_temperature": {
        "avg": 32.5,
        "min": 25.3,
        "max": 42.1
      },
      "humidity": {
        "avg": 45.2
      },
      "total_readings": 288,
      "good_readings": 285
    }
  ],
  "count": 1
}
```

#### GET `/aggregates/weekly`
Get weekly aggregated statistics (7-day rolling window).

**Query Parameters:**
- `sensor_id` (optional): Filter by specific sensor
- `afforestation_status` (optional): Filter by status (Afforested/Non-afforested/Pre-afforestation)
- `week_start` (date): Week start date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "week_start": "2025-01-13",
    "week_end": "2025-01-19",
    "sensors": [
      {
        "sensor_id": "PSU-N001",
        "afforestation_status": "Afforested",
        "daily_data": [
          {
            "day": "Sun",
            "date": "2025-01-13",
            "co2_avg": 410.5,
            "air_temp_avg": 27.5,
            "surface_temp_avg": 31.2
          }
        ]
      }
    ]
  }
}
```

---

### 4. Historical Baselines

#### GET `/baselines/2019`
Get 2019 baseline data for comparison.

**Query Parameters:**
- `location` (optional): Location name (default: "Prince Sultan University")
- `month` (optional): Specific month (1-12)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "location_name": "Prince Sultan University",
      "year": 2019,
      "month": 1,
      "co2_avg": 410.5,
      "air_temp_avg": 18.5,
      "surface_temp_avg": 22.3,
      "humidity_avg": 45.0,
      "bounding_box": {
        "north": 24.73810,
        "south": 24.73400,
        "east": 46.70420,
        "west": 46.69770
      }
    }
  ],
  "count": 1
}
```

---

### 5. Dashboard Data

#### GET `/dashboard/overview`
Get comprehensive dashboard overview data (optimized for frontend).

**Response:**
```json
{
  "success": true,
  "data": {
    "sensors_summary": {
      "total": 3,
      "active": 3,
      "warning": 0,
      "offline": 0
    },
    "current_readings": {
      "afforested": {
        "co2_avg": 415.5,
        "air_temp_avg": 28.3,
        "surface_temp_avg": 32.5
      },
      "non_afforested": {
        "co2_avg": 450.2,
        "air_temp_avg": 32.5,
        "surface_temp_avg": 38.7
      },
      "pre_afforestation": {
        "co2_avg": 435.8,
        "air_temp_avg": 30.1,
        "surface_temp_avg": 35.2
      }
    },
    "weekly_trend": {
      "data": [
        {
          "day": "Sun",
          "date": "2025-01-13",
          "afforested_co2": 410.5,
          "non_afforested_co2": 445.2,
          "pre_afforestation_co2": 432.1
        }
      ]
    },
    "comparison_2019": {
      "current_month_avg": {
        "co2": 433.8,
        "air_temp": 30.3,
        "surface_temp": 35.5
      },
      "baseline_2019_avg": {
        "co2": 410.5,
        "air_temp": 18.5,
        "surface_temp": 22.3
      },
      "difference": {
        "co2_change": 23.3,
        "temp_change": 11.8,
        "surface_temp_change": 13.2
      }
    },
    "last_updated": "2025-01-15T10:30:00Z"
  }
}
```

#### GET `/dashboard/heat-map`
Get heat map data for all sensors (for map visualization).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "sensor_id": "PSU-N001",
      "area": "North Zone",
      "coordinates": {
        "latitude": 24.73700000,
        "longitude": 46.70100000
      },
      "temperature": 32.5,
      "afforestation_status": "Afforested",
      "timestamp": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### 6. Alerts

#### GET `/alerts`
Get active alerts.

**Query Parameters:**
- `sensor_id` (optional): Filter by sensor
- `is_resolved` (optional): true/false
- `severity` (optional): Info/Warning/Critical

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "sensor_id": "PSU-N002",
      "alert_type": "High_CO2",
      "severity": "Warning",
      "message": "CO2 level is 755.2 ppm",
      "threshold_value": 700.0,
      "actual_value": 755.2,
      "triggered_at": "2025-01-15T10:25:00Z",
      "is_resolved": false
    }
  ],
  "count": 1
}
```

#### PUT `/alerts/:id/resolve`
Mark an alert as resolved.

---

## Authentication

### POST `/auth/login`
Login to get JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "Admin"
    },
    "expires_in": 86400
  }
}
```

### POST `/auth/refresh`
Refresh JWT token.

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid sensor_id provided",
    "details": {
      "field": "sensor_id",
      "value": "INVALID"
    }
  }
}
```

**Error Codes:**
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Rate Limiting

- **Public endpoints**: 100 requests per minute
- **Authenticated endpoints**: 500 requests per minute
- **Sensor data submission**: 1000 requests per minute per sensor

---

## Sensor Integration

### LoRaWAN Integration

Sensors send data via LoRaWAN gateway to the backend API.

**Sensor Payload Format (Example):**
```json
{
  "device_id": "PSU-N001",
  "timestamp": 1705315800,
  "data": {
    "co2": 415.5,
    "air_temp": 28.3,
    "surface_temp": 32.5,
    "humidity": 45.2,
    "battery": 3.7,
    "rssi": -75
  }
}
```

**Middleware Processing:**
1. Gateway receives LoRaWAN packet
2. Middleware decodes payload
3. Transforms to API format
4. Sends POST request to `/readings` endpoint

---

## Backend Implementation Example (Node.js + Express)

### Project Structure:
```
backend/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── models/
│   │   ├── Sensor.js
│   │   ├── SensorReading.js
│   │   └── DailyAggregate.js
│   ├── routes/
│   │   ├── sensors.js
│   │   ├── readings.js
│   │   ├── aggregates.js
│   │   └── dashboard.js
│   ├── controllers/
│   │   ├── sensorController.js
│   │   ├── readingController.js
│   │   └── dashboardController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── validation.js
│   ├── services/
│   │   ├── aggregationService.js
│   │   └── alertService.js
│   └── app.js
├── package.json
└── .env
```

### Basic Express Server (`src/app.js`):
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100
});
app.use(limiter);

// Routes
app.use('/api/v1/sensors', require('./routes/sensors'));
app.use('/api/v1/readings', require('./routes/readings'));
app.use('/api/v1/aggregates', require('./routes/aggregates'));
app.use('/api/v1/dashboard', require('./routes/dashboard'));
app.use('/api/v1/alerts', require('./routes/alerts'));
app.use('/api/v1/auth', require('./routes/auth'));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message
    }
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Example Controller (`src/controllers/readingController.js`):
```javascript
const SensorReading = require('../models/SensorReading');

exports.createReading = async (req, res, next) => {
  try {
    const {
      sensor_id,
      timestamp,
      co2_ppm,
      air_temperature,
      surface_temperature,
      humidity,
      rssi,
      battery_voltage
    } = req.body;

    // Validate sensor exists
    const sensor = await Sensor.findByPk(sensor_id);
    if (!sensor) {
      return res.status(404).json({
        success: false,
        error: { code: 'SENSOR_NOT_FOUND', message: 'Sensor not found' }
      });
    }

    // Create reading
    const reading = await SensorReading.create({
      sensor_id,
      timestamp: timestamp || new Date(),
      co2_ppm,
      air_temperature,
      surface_temperature,
      humidity,
      rssi,
      battery_voltage,
      data_quality: 'Good'
    });

    // Update sensor status
    await sensor.update({ updated_at: new Date() });

    res.status(201).json({
      success: true,
      message: 'Reading recorded successfully',
      data: {
        id: reading.id,
        sensor_id: reading.sensor_id,
        timestamp: reading.timestamp
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getReadings = async (req, res, next) => {
  try {
    const {
      sensor_id,
      from,
      to,
      limit = 100,
      quality
    } = req.query;

    const where = {};
    if (sensor_id) where.sensor_id = sensor_id;
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp[Op.gte] = new Date(from);
      if (to) where.timestamp[Op.lte] = new Date(to);
    }
    if (quality) where.data_quality = quality;

    const readings = await SensorReading.findAll({
      where,
      limit: Math.min(parseInt(limit), 1000),
      order: [['timestamp', 'DESC']]
    });

    res.json({
      success: true,
      data: readings,
      count: readings.length
    });
  } catch (error) {
    next(error);
  }
};
```

---

## Frontend Integration

### Update Dashboard API Service

Create a new file `/src/services/BackendApiService.js`:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

export const BackendApiService = {
  async getSensors() {
    const response = await fetch(`${API_BASE_URL}/sensors`);
    const data = await response.json();
    return data.data;
  },

  async getSensorReadings(sensorId, from, to) {
    const params = new URLSearchParams();
    if (sensorId) params.append('sensor_id', sensorId);
    if (from) params.append('from', from.toISOString());
    if (to) params.append('to', to.toISOString());

    const response = await fetch(`${API_BASE_URL}/readings?${params}`);
    const data = await response.json();
    return data.data;
  },

  async getDashboardOverview() {
    const response = await fetch(`${API_BASE_URL}/dashboard/overview`);
    const data = await response.json();
    return data.data;
  },

  async getWeeklyAggregates(weekStart) {
    const response = await fetch(
      `${API_BASE_URL}/aggregates/weekly?week_start=${weekStart}`
    );
    const data = await response.json();
    return data.data;
  }
};
```

---

## Deployment

### Environment Variables (`.env`):
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=rawdahscope_db
DB_USER=rawdahscope_app
DB_PASSWORD=secure_password_here

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRY=86400

# API
PORT=3001
NODE_ENV=production

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Docker Compose Setup:
```yaml
version: '3.8'

services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: rawdahscope_db
      MYSQL_USER: rawdahscope_app
      MYSQL_PASSWORD: secure_password
      MYSQL_ROOT_PASSWORD: root_password
    ports:
      - "3306:3306"
    volumes:
      - db_data:/var/lib/mysql

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      DB_HOST: db
      DB_PORT: 3306
      DB_NAME: rawdahscope_db
      DB_USER: rawdahscope_app
      DB_PASSWORD: secure_password
    depends_on:
      - db

volumes:
  db_data:
```

---

## Next Steps

1. **Set up database** using `DATABASE_SCHEMA.md`
2. **Implement backend API** using this specification
3. **Configure sensors** to send data to API endpoints
4. **Update React dashboard** to fetch data from backend API
5. **Deploy** to production server
