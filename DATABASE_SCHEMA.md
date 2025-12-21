# RawdahScope Database Schema

This document describes the database schema for the RawdahScope environmental monitoring system at Prince Sultan University.

## Database Overview

The system uses a relational database structure to store sensor data, environmental readings, and historical records. Recommended databases: PostgreSQL, MySQL, or MariaDB.

---

## Tables

### 1. `sensors`
Stores information about physical sensor nodes deployed at PSU.

```sql
CREATE TABLE sensors (
    id VARCHAR(20) PRIMARY KEY,                    -- e.g., 'PSU-N001'
    name VARCHAR(100) NOT NULL,                    -- e.g., 'PSU Campus - North Zone'
    location VARCHAR(200),                         -- Descriptive location
    district VARCHAR(100),                         -- e.g., 'Prince Sultan University'
    afforestation_status ENUM('Afforested', 'Non-afforested', 'Pre-afforestation'),
    station_type ENUM('Node', 'Gateway', 'Node/Gateway'),
    sensor_types TEXT,                             -- e.g., 'MH-Z19B, MLX90614, DS18B20, SHT30'
    latitude DECIMAL(10, 8) NOT NULL,              -- e.g., 24.73700000
    longitude DECIMAL(11, 8) NOT NULL,             -- e.g., 46.70100000
    installation_date DATE,
    status ENUM('Active', 'Warning', 'Offline', 'Maintenance') DEFAULT 'Active',
    battery_level INT DEFAULT 100,                 -- Percentage (0-100)
    last_maintenance DATE,
    firmware_version VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_status (status),
    INDEX idx_location (latitude, longitude),
    INDEX idx_afforestation (afforestation_status)
);
```

**Sample Data:**
```sql
INSERT INTO sensors (id, name, location, district, afforestation_status, station_type, sensor_types, latitude, longitude, installation_date) VALUES
('PSU-N001', 'PSU Campus - North Zone', 'North Zone', 'Prince Sultan University', 'Afforested', 'Node/Gateway', 'MH-Z19B, MLX90614, DS18B20, SHT30 + LoRaWAN Gateway', 24.73700000, 46.70100000, '2025-01-01'),
('PSU-N002', 'PSU Campus - Central Zone', 'Central Zone', 'Prince Sultan University', 'Non-afforested', 'Node', 'MH-Z19B, MLX90614, DS18B20, SHT30', 24.73600000, 46.70000000, '2025-01-01'),
('PSU-N003', 'PSU Campus - South Zone', 'South Zone', 'Prince Sultan University', 'Pre-afforestation', 'Node', 'MH-Z19B, MLX90614, DS18B20, SHT30', 24.73500000, 46.70200000, '2025-01-01');
```

---

### 2. `sensor_readings`
Stores real-time environmental measurements from sensors.

```sql
CREATE TABLE sensor_readings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sensor_id VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- CO2 measurements
    co2_ppm DECIMAL(8, 2),                         -- CO2 level in parts per million

    -- Temperature measurements
    air_temperature DECIMAL(5, 2),                 -- Air temperature in Celsius
    surface_temperature DECIMAL(5, 2),             -- Surface/ground temperature in Celsius

    -- Humidity
    humidity DECIMAL(5, 2),                        -- Relative humidity percentage

    -- Air quality (optional - if PM sensors are added)
    pm25 DECIMAL(8, 2),                            -- PM2.5 in μg/m³
    pm10 DECIMAL(8, 2),                            -- PM10 in μg/m³

    -- Sensor metadata
    rssi INT,                                      -- Signal strength (for LoRaWAN)
    battery_voltage DECIMAL(4, 2),                 -- Battery voltage

    -- Data quality flags
    data_quality ENUM('Good', 'Fair', 'Poor') DEFAULT 'Good',
    is_validated BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE,

    INDEX idx_sensor_time (sensor_id, timestamp),
    INDEX idx_timestamp (timestamp),
    INDEX idx_sensor_quality (sensor_id, data_quality)
);
```

**Sample Data:**
```sql
INSERT INTO sensor_readings (sensor_id, co2_ppm, air_temperature, surface_temperature, humidity, rssi) VALUES
('PSU-N001', 415.5, 28.3, 32.5, 45.2, -75),
('PSU-N002', 450.2, 32.5, 38.7, 38.5, -68),
('PSU-N003', 435.8, 30.1, 35.2, 42.0, -72);
```

---

### 3. `daily_aggregates`
Pre-calculated daily statistics for faster dashboard queries.

```sql
CREATE TABLE daily_aggregates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sensor_id VARCHAR(20) NOT NULL,
    date DATE NOT NULL,

    -- CO2 aggregates
    co2_avg DECIMAL(8, 2),
    co2_min DECIMAL(8, 2),
    co2_max DECIMAL(8, 2),

    -- Temperature aggregates
    air_temp_avg DECIMAL(5, 2),
    air_temp_min DECIMAL(5, 2),
    air_temp_max DECIMAL(5, 2),

    surface_temp_avg DECIMAL(5, 2),
    surface_temp_min DECIMAL(5, 2),
    surface_temp_max DECIMAL(5, 2),

    -- Humidity aggregates
    humidity_avg DECIMAL(5, 2),

    -- Data quality
    total_readings INT DEFAULT 0,
    good_readings INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_sensor_date (sensor_id, date),

    INDEX idx_sensor_date (sensor_id, date),
    INDEX idx_date (date)
);
```

---

### 4. `historical_baselines`
Stores 2019 baseline data for comparison (monthly averages).

```sql
CREATE TABLE historical_baselines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_name VARCHAR(100),                    -- e.g., 'Prince Sultan University'
    year INT NOT NULL,
    month INT NOT NULL,                            -- 1-12

    -- Environmental metrics
    co2_avg DECIMAL(8, 2),
    air_temp_avg DECIMAL(5, 2),
    surface_temp_avg DECIMAL(5, 2),
    humidity_avg DECIMAL(5, 2),

    -- Bounding box coordinates
    bbox_north DECIMAL(10, 8),
    bbox_south DECIMAL(10, 8),
    bbox_east DECIMAL(11, 8),
    bbox_west DECIMAL(11, 8),

    data_source VARCHAR(200),                      -- e.g., 'Open-Meteo Historical API'

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_location_date (location_name, year, month),
    INDEX idx_year_month (year, month)
);
```

**Sample 2019 Baseline Data:**
```sql
INSERT INTO historical_baselines (location_name, year, month, co2_avg, air_temp_avg, surface_temp_avg, humidity_avg, bbox_north, bbox_south, bbox_east, bbox_west, data_source) VALUES
('Prince Sultan University', 2019, 1, 410.5, 18.5, 22.3, 45.0, 24.73810, 24.73400, 46.70420, 46.69770, 'Open-Meteo Historical API'),
('Prince Sultan University', 2019, 2, 412.0, 20.2, 24.5, 42.0, 24.73810, 24.73400, 46.70420, 46.69770, 'Open-Meteo Historical API'),
('Prince Sultan University', 2019, 3, 413.5, 24.5, 28.7, 38.5, 24.73810, 24.73400, 46.70420, 46.69770, 'Open-Meteo Historical API');
-- ... add more months
```

---

### 5. `alerts`
Stores alerts and notifications based on sensor thresholds.

```sql
CREATE TABLE alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sensor_id VARCHAR(20) NOT NULL,
    alert_type ENUM('High_CO2', 'High_Temperature', 'Low_Battery', 'Sensor_Offline', 'Data_Quality') NOT NULL,
    severity ENUM('Info', 'Warning', 'Critical') NOT NULL,
    message TEXT,
    threshold_value DECIMAL(10, 2),                -- The threshold that was exceeded
    actual_value DECIMAL(10, 2),                   -- The actual sensor value
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    is_resolved BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE,

    INDEX idx_sensor_unresolved (sensor_id, is_resolved),
    INDEX idx_triggered_at (triggered_at)
);
```

---

### 6. `users` (Optional - for dashboard authentication)
Stores user accounts for dashboard access.

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,          -- Use bcrypt or similar
    role ENUM('Admin', 'Researcher', 'Viewer') DEFAULT 'Viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,

    INDEX idx_username (username),
    INDEX idx_email (email)
);
```

---

## Database Relationships

```
sensors (1) ──────< (∞) sensor_readings
   │
   └──────< (∞) daily_aggregates
   │
   └──────< (∞) alerts

historical_baselines (standalone reference data)

users (optional, for authentication)
```

---

## Indexes and Performance

### Recommended Composite Indexes:
```sql
-- For time-series queries
CREATE INDEX idx_readings_sensor_time ON sensor_readings(sensor_id, timestamp DESC);

-- For dashboard aggregation queries
CREATE INDEX idx_readings_time_quality ON sensor_readings(timestamp, data_quality);

-- For alert monitoring
CREATE INDEX idx_alerts_active ON alerts(sensor_id, is_resolved, triggered_at DESC);
```

### Partitioning Strategy (for large datasets):
```sql
-- Partition sensor_readings by month
ALTER TABLE sensor_readings PARTITION BY RANGE (YEAR(timestamp) * 100 + MONTH(timestamp)) (
    PARTITION p202501 VALUES LESS THAN (202502),
    PARTITION p202502 VALUES LESS THAN (202503),
    -- Add more partitions as needed
);
```

---

## Stored Procedures

### 1. Calculate Daily Aggregates
```sql
DELIMITER //

CREATE PROCEDURE calculate_daily_aggregates(IN target_date DATE)
BEGIN
    INSERT INTO daily_aggregates (
        sensor_id, date,
        co2_avg, co2_min, co2_max,
        air_temp_avg, air_temp_min, air_temp_max,
        surface_temp_avg, surface_temp_min, surface_temp_max,
        humidity_avg,
        total_readings, good_readings
    )
    SELECT
        sensor_id,
        DATE(timestamp) as date,
        AVG(co2_ppm), MIN(co2_ppm), MAX(co2_ppm),
        AVG(air_temperature), MIN(air_temperature), MAX(air_temperature),
        AVG(surface_temperature), MIN(surface_temperature), MAX(surface_temperature),
        AVG(humidity),
        COUNT(*) as total_readings,
        SUM(CASE WHEN data_quality = 'Good' THEN 1 ELSE 0 END) as good_readings
    FROM sensor_readings
    WHERE DATE(timestamp) = target_date
    GROUP BY sensor_id, DATE(timestamp)
    ON DUPLICATE KEY UPDATE
        co2_avg = VALUES(co2_avg),
        co2_min = VALUES(co2_min),
        co2_max = VALUES(co2_max),
        air_temp_avg = VALUES(air_temp_avg),
        air_temp_min = VALUES(air_temp_min),
        air_temp_max = VALUES(air_temp_max),
        surface_temp_avg = VALUES(surface_temp_avg),
        surface_temp_min = VALUES(surface_temp_min),
        surface_temp_max = VALUES(surface_temp_max),
        humidity_avg = VALUES(humidity_avg),
        total_readings = VALUES(total_readings),
        good_readings = VALUES(good_readings);
END //

DELIMITER ;
```

### 2. Check Sensor Health and Generate Alerts
```sql
DELIMITER //

CREATE PROCEDURE check_sensor_health()
BEGIN
    -- Check for high CO2 levels
    INSERT INTO alerts (sensor_id, alert_type, severity, message, threshold_value, actual_value)
    SELECT
        sensor_id,
        'High_CO2',
        CASE
            WHEN co2_ppm > 1000 THEN 'Critical'
            WHEN co2_ppm > 700 THEN 'Warning'
            ELSE 'Info'
        END,
        CONCAT('CO2 level is ', co2_ppm, ' ppm'),
        700,
        co2_ppm
    FROM sensor_readings
    WHERE timestamp > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
      AND co2_ppm > 700
      AND NOT EXISTS (
          SELECT 1 FROM alerts
          WHERE alerts.sensor_id = sensor_readings.sensor_id
            AND alert_type = 'High_CO2'
            AND is_resolved = FALSE
      );

    -- Check for sensors that haven't reported in 30 minutes
    INSERT INTO alerts (sensor_id, alert_type, severity, message)
    SELECT
        s.id,
        'Sensor_Offline',
        'Critical',
        CONCAT('Sensor ', s.id, ' has not reported data in 30 minutes')
    FROM sensors s
    LEFT JOIN sensor_readings sr ON s.id = sr.sensor_id
        AND sr.timestamp > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    WHERE sr.id IS NULL
      AND s.status = 'Active'
      AND NOT EXISTS (
          SELECT 1 FROM alerts
          WHERE alerts.sensor_id = s.id
            AND alert_type = 'Sensor_Offline'
            AND is_resolved = FALSE
      );
END //

DELIMITER ;
```

---

## Data Retention Policy

```sql
-- Archive old readings to reduce table size (keep last 90 days in hot storage)
CREATE TABLE sensor_readings_archive LIKE sensor_readings;

-- Move old data to archive (run monthly)
INSERT INTO sensor_readings_archive
SELECT * FROM sensor_readings
WHERE timestamp < DATE_SUB(NOW(), INTERVAL 90 DAY);

DELETE FROM sensor_readings
WHERE timestamp < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

---

## Backup Strategy

1. **Full Backup**: Daily at 2 AM
2. **Incremental Backup**: Every 6 hours
3. **Retention**: 30 days of daily backups

```bash
# Example MySQL backup command
mysqldump -u root -p rawdahscope_db > backup_$(date +%Y%m%d).sql
```

---

## Initial Database Setup

```sql
-- Create database
CREATE DATABASE rawdahscope_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE rawdahscope_db;

-- Run all CREATE TABLE statements above

-- Grant permissions to application user
CREATE USER 'rawdahscope_app'@'localhost' IDENTIFIED BY 'secure_password_here';
GRANT SELECT, INSERT, UPDATE ON rawdahscope_db.* TO 'rawdahscope_app'@'localhost';
FLUSH PRIVILEGES;
```

---

## Next Steps

1. Set up the database using this schema
2. Configure the backend API (see `BACKEND_API.md`)
3. Connect sensors to send data to the API
4. Configure the dashboard to fetch data from the API
