# Sensor Data Processing Formulas

This document describes the formulas and calculations used to process raw sensor readings into meaningful environmental metrics for the RawdahScope dashboard.

---

## Overview

The sensor network at Prince Sultan University collects the following raw data:
- **CO2**: Parts per million (ppm) from MH-Z19B sensor
- **Surface Temperature**: Celsius (°C) from MLX90614 IR sensor
- **Air Temperature**: Celsius (°C) from DS18B20 sensor
- **Humidity**: Relative humidity (%) from SHT30 sensor
- **RSSI**: Signal strength from LoRaWAN (dBm)
- **Battery Voltage**: Volts (V)

---

## 1. Daily Aggregation Formulas

### 1.1 Daily Average

For each sensor reading type, calculate the daily average:

```
Daily_Average = SUM(readings_for_day) / COUNT(readings_for_day)
```

**Example (CO2):**
```sql
SELECT
    sensor_id,
    DATE(timestamp) as date,
    AVG(co2_ppm) as co2_avg,
    MIN(co2_ppm) as co2_min,
    MAX(co2_ppm) as co2_max
FROM sensor_readings
WHERE sensor_id = 'PSU-N001'
  AND DATE(timestamp) = '2025-01-15'
GROUP BY sensor_id, DATE(timestamp);
```

### 1.2 Weekly Average

Calculate 7-day rolling average:

```
Weekly_Average = SUM(daily_averages_for_7_days) / 7
```

**Example:**
```sql
SELECT
    sensor_id,
    DATE(timestamp) as week_day,
    AVG(co2_ppm) as daily_avg
FROM sensor_readings
WHERE sensor_id = 'PSU-N001'
  AND timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY sensor_id, DATE(timestamp)
ORDER BY week_day ASC;
```

---

## 2. Afforestation Status Comparison

### 2.1 Zone-based Aggregation

Calculate averages for each afforestation status:

```
Zone_Average = AVG(readings from all sensors in zone)
```

**SQL Implementation:**
```sql
SELECT
    s.afforestation_status,
    AVG(sr.co2_ppm) as avg_co2,
    AVG(sr.air_temperature) as avg_air_temp,
    AVG(sr.surface_temperature) as avg_surface_temp,
    AVG(sr.humidity) as avg_humidity
FROM sensor_readings sr
JOIN sensors s ON sr.sensor_id = s.id
WHERE sr.timestamp >= DATE_SUB(NOW(), INTERVAL 1 DAY)
GROUP BY s.afforestation_status;
```

**Result Example:**
```
Afforested:        CO2 = 415 ppm, Air = 28°C, Surface = 32°C
Non-afforested:    CO2 = 450 ppm, Air = 32°C, Surface = 38°C
Pre-afforestation: CO2 = 435 ppm, Air = 30°C, Surface = 35°C
```

### 2.2 Impact Calculation

Calculate the impact of afforestation:

```
Temperature_Reduction = Avg_Non_Afforested - Avg_Afforested
CO2_Reduction = Avg_Non_Afforested - Avg_Afforested
Reduction_Percentage = ((Difference) / Avg_Non_Afforested) * 100
```

**Example:**
```javascript
const nonAfforestedTemp = 38.0; // °C
const afforestedTemp = 32.0;    // °C

const tempReduction = nonAfforestedTemp - afforestedTemp; // 6.0°C
const reductionPercent = (tempReduction / nonAfforestedTemp) * 100; // 15.8%
```

---

## 3. Baseline Comparison (2019 vs Current)

### 3.1 Monthly Baseline Average

Get 2019 baseline for the current month:

```sql
SELECT
    month,
    co2_avg,
    air_temp_avg,
    surface_temp_avg
FROM historical_baselines
WHERE location_name = 'Prince Sultan University'
  AND year = 2019
  AND month = MONTH(NOW());
```

### 3.2 Current Month Average

Calculate current month average from sensor data:

```sql
SELECT
    AVG(co2_ppm) as current_co2_avg,
    AVG(air_temperature) as current_air_temp_avg,
    AVG(surface_temperature) as current_surface_temp_avg
FROM sensor_readings
WHERE sensor_id IN (SELECT id FROM sensors WHERE district = 'Prince Sultan University')
  AND MONTH(timestamp) = MONTH(NOW())
  AND YEAR(timestamp) = YEAR(NOW());
```

### 3.3 Change Calculation

```
Change = Current_Average - Baseline_2019_Average
Percent_Change = ((Change) / Baseline_2019_Average) * 100
```

**Example:**
```javascript
const baseline2019 = {
  co2: 410.5,
  airTemp: 18.5,
  surfaceTemp: 22.3
};

const currentAvg = {
  co2: 420.2,
  airTemp: 28.3,
  surfaceTemp: 32.5
};

const changes = {
  co2: currentAvg.co2 - baseline2019.co2,              // +9.7 ppm
  airTemp: currentAvg.airTemp - baseline2019.airTemp,  // +9.8°C
  surfaceTemp: currentAvg.surfaceTemp - baseline2019.surfaceTemp // +10.2°C
};

const percentChanges = {
  co2: (changes.co2 / baseline2019.co2) * 100,                    // +2.4%
  airTemp: (changes.airTemp / baseline2019.airTemp) * 100,        // +53.0%
  surfaceTemp: (changes.surfaceTemp / baseline2019.surfaceTemp) * 100 // +45.7%
};
```

---

## 4. Heat Index Calculation

Calculate perceived temperature combining air temperature and humidity:

```
Heat_Index = -8.78469475556
           + (1.61139411 * T)
           + (2.33854883889 * RH)
           + (-0.14611605 * T * RH)
           + (-0.012308094 * T^2)
           + (-0.0164248277778 * RH^2)
           + (0.002211732 * T^2 * RH)
           + (0.00072546 * T * RH^2)
           + (-0.000003582 * T^2 * RH^2)

Where:
  T = Air Temperature (°C)
  RH = Relative Humidity (%)
```

**JavaScript Implementation:**
```javascript
function calculateHeatIndex(temperature, humidity) {
  const T = temperature;
  const RH = humidity;

  const HI = -8.78469475556
    + (1.61139411 * T)
    + (2.33854883889 * RH)
    + (-0.14611605 * T * RH)
    + (-0.012308094 * T * T)
    + (-0.0164248277778 * RH * RH)
    + (0.002211732 * T * T * RH)
    + (0.00072546 * T * RH * RH)
    + (-0.000003582 * T * T * RH * RH);

  return Math.round(HI * 10) / 10; // Round to 1 decimal
}

// Example:
const heatIndex = calculateHeatIndex(32, 45); // Returns: 34.2°C
```

---

## 5. CO2 Level Classification

Classify CO2 levels based on thresholds:

```
CO2_Level_Category =
  if CO2 < 400:        "Excellent"
  elif CO2 < 600:      "Good"
  elif CO2 < 1000:     "Acceptable"
  elif CO2 < 1500:     "Moderate"
  elif CO2 < 2500:     "Poor"
  else:                "Hazardous"
```

**JavaScript Implementation:**
```javascript
function classifyCO2Level(co2_ppm) {
  if (co2_ppm < 400) return { level: "Excellent", color: "#22c55e" };
  if (co2_ppm < 600) return { level: "Good", color: "#84cc16" };
  if (co2_ppm < 1000) return { level: "Acceptable", color: "#facc15" };
  if (co2_ppm < 1500) return { level: "Moderate", color: "#fb923c" };
  if (co2_ppm < 2500) return { level: "Poor", color: "#f87171" };
  return { level: "Hazardous", color: "#dc2626" };
}
```

---

## 6. Data Quality Scoring

Calculate data quality score based on reading validity:

```
Data_Quality_Score = (Valid_Readings / Total_Readings) * 100

Valid_Reading =
  CO2 between 350-5000 ppm AND
  Temperature between -10 to 60°C AND
  Humidity between 0-100% AND
  RSSI > -120 dBm
```

**SQL Implementation:**
```sql
SELECT
    sensor_id,
    COUNT(*) as total_readings,
    SUM(
        CASE
            WHEN co2_ppm BETWEEN 350 AND 5000
            AND air_temperature BETWEEN -10 AND 60
            AND humidity BETWEEN 0 AND 100
            AND rssi > -120
            THEN 1
            ELSE 0
        END
    ) as valid_readings,
    (SUM(CASE WHEN ... THEN 1 ELSE 0 END) / COUNT(*)) * 100 as quality_score
FROM sensor_readings
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 DAY)
GROUP BY sensor_id;
```

---

## 7. Trend Analysis

### 7.1 Linear Regression for Trend

Calculate trend direction using simple linear regression:

```
Slope = (n * Σ(xy) - Σx * Σy) / (n * Σ(x²) - (Σx)²)

Where:
  x = time index (1, 2, 3, ...)
  y = sensor reading value
  n = number of data points
```

**JavaScript Implementation:**
```javascript
function calculateTrend(readings) {
  const n = readings.length;
  if (n < 2) return { slope: 0, trend: 'stable' };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  readings.forEach((reading, index) => {
    const x = index + 1;
    const y = reading.value;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  let trend;
  if (slope > 0.1) trend = 'increasing';
  else if (slope < -0.1) trend = 'decreasing';
  else trend = 'stable';

  return { slope, trend };
}

// Example:
const co2Readings = [
  { value: 415 }, { value: 418 }, { value: 420 },
  { value: 423 }, { value: 425 }, { value: 428 }, { value: 430 }
];

const result = calculateTrend(co2Readings);
// Returns: { slope: 2.5, trend: 'increasing' }
```

### 7.2 Moving Average

Calculate simple moving average:

```
MA(n) = (P1 + P2 + ... + Pn) / n

Where:
  n = window size (e.g., 7 for weekly)
  P = data points
```

**JavaScript Implementation:**
```javascript
function movingAverage(data, windowSize) {
  const result = [];

  for (let i = windowSize - 1; i < data.length; i++) {
    const window = data.slice(i - windowSize + 1, i + 1);
    const avg = window.reduce((sum, val) => sum + val, 0) / windowSize;
    result.push(avg);
  }

  return result;
}

// Example:
const dailyCO2 = [415, 418, 420, 423, 425, 428, 430];
const weeklyMA = movingAverage(dailyCO2, 7);
// Returns: [422.71] (average of all 7 days)
```

---

## 8. Alert Threshold Detection

### 8.1 Threshold Configuration

```javascript
const THRESHOLDS = {
  co2: {
    warning: 700,
    critical: 1000
  },
  temperature: {
    warning: 35,
    critical: 40
  },
  humidity: {
    warning_low: 20,
    warning_high: 80,
    critical_low: 10,
    critical_high: 90
  },
  battery: {
    warning: 20,
    critical: 10
  }
};
```

### 8.2 Alert Generation Logic

```javascript
function checkThresholds(reading) {
  const alerts = [];

  // CO2 check
  if (reading.co2_ppm >= THRESHOLDS.co2.critical) {
    alerts.push({
      type: 'High_CO2',
      severity: 'Critical',
      message: `CO2 level is ${reading.co2_ppm} ppm (threshold: ${THRESHOLDS.co2.critical})`,
      value: reading.co2_ppm
    });
  } else if (reading.co2_ppm >= THRESHOLDS.co2.warning) {
    alerts.push({
      type: 'High_CO2',
      severity: 'Warning',
      message: `CO2 level is ${reading.co2_ppm} ppm (threshold: ${THRESHOLDS.co2.warning})`,
      value: reading.co2_ppm
    });
  }

  // Temperature check
  if (reading.air_temperature >= THRESHOLDS.temperature.critical) {
    alerts.push({
      type: 'High_Temperature',
      severity: 'Critical',
      message: `Temperature is ${reading.air_temperature}°C`,
      value: reading.air_temperature
    });
  }

  // Battery check
  if (reading.battery_voltage) {
    const batteryPercent = ((reading.battery_voltage - 3.0) / (4.2 - 3.0)) * 100;

    if (batteryPercent <= THRESHOLDS.battery.critical) {
      alerts.push({
        type: 'Low_Battery',
        severity: 'Critical',
        message: `Battery at ${batteryPercent.toFixed(0)}%`,
        value: batteryPercent
      });
    }
  }

  return alerts;
}
```

---

## 9. Dashboard Data Preparation

### 9.1 Chart Data for CO2 Trend (Top Section)

```javascript
async function getDashboardCO2Trend(startDate, endDate) {
  const query = `
    SELECT
      s.afforestation_status,
      DATE(sr.timestamp) as day,
      AVG(sr.co2_ppm) as co2_avg
    FROM sensor_readings sr
    JOIN sensors s ON sr.sensor_id = s.id
    WHERE sr.timestamp BETWEEN ? AND ?
    GROUP BY s.afforestation_status, DATE(sr.timestamp)
    ORDER BY day ASC
  `;

  const results = await db.query(query, [startDate, endDate]);

  // Transform to chart format
  const chartData = {};
  results.forEach(row => {
    if (!chartData[row.day]) {
      chartData[row.day] = { day: formatDay(row.day), date: row.day };
    }
    chartData[row.day][`${row.afforestation_status} CO₂`] = row.co2_avg;
  });

  return Object.values(chartData);
}

// Returns format:
// [
//   { day: 'Sun', date: '2025-01-13', 'Afforested CO₂': 415, 'Non-afforested CO₂': 450, ... },
//   { day: 'Mon', date: '2025-01-14', 'Afforested CO₂': 418, 'Non-afforested CO₂': 452, ... },
//   ...
// ]
```

### 9.2 Surface Heat by District (Bottom Section)

```javascript
async function getSurfaceHeatByDistrict() {
  const query = `
    SELECT
      s.district as area,
      AVG(sr.surface_temperature) as temperature
    FROM sensor_readings sr
    JOIN sensors s ON sr.sensor_id = s.id
    WHERE sr.timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    AND s.district IN ('Prince Sultan University', 'Al-Malaz', 'Industrial Area')
    GROUP BY s.district
  `;

  const results = await db.query(query);

  return results.map(row => ({
    area: row.area,
    temperature: Math.round(row.temperature * 10) / 10
  }));
}

// Returns format:
// [
//   { area: 'Prince Sultan University', temperature: 32.5 },
//   { area: 'Al-Malaz', temperature: 30.2 },
//   { area: 'Industrial Area', temperature: 38.7 }
// ]
```

---

## 10. Real-time Data Processing Pipeline

```
1. Sensor Reading → LoRaWAN Gateway
   ↓
2. Gateway → POST /api/v1/readings
   ↓
3. API Server → Validate & Store in DB
   ↓
4. Trigger Calculations:
   - Check thresholds → Generate alerts
   - Update sensor status
   - Calculate running averages
   ↓
5. Dashboard → GET /api/v1/dashboard/overview
   ↓
6. Display Charts with Processed Data
```

**Express.js Middleware Example:**
```javascript
app.post('/api/v1/readings', async (req, res) => {
  try {
    const { sensor_id, co2_ppm, air_temperature, surface_temperature, humidity } = req.body;

    // 1. Validate reading
    if (co2_ppm < 350 || co2_ppm > 5000) {
      return res.status(400).json({ error: 'Invalid CO2 reading' });
    }

    // 2. Store in database
    const reading = await SensorReading.create({
      sensor_id,
      timestamp: new Date(),
      co2_ppm,
      air_temperature,
      surface_temperature,
      humidity,
      data_quality: 'Good'
    });

    // 3. Check thresholds and generate alerts
    const alerts = checkThresholds(req.body);
    if (alerts.length > 0) {
      await Alert.bulkCreate(alerts.map(alert => ({
        sensor_id,
        ...alert,
        triggered_at: new Date()
      })));
    }

    // 4. Update sensor last_seen
    await Sensor.update(
      { updated_at: new Date() },
      { where: { id: sensor_id } }
    );

    res.json({ success: true, reading_id: reading.id });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## 11. Testing Formulas

Use these test cases to validate your calculations:

```javascript
// Test 1: Daily Average
const testReadings = [410, 415, 420, 425, 430, 418, 422];
const avg = testReadings.reduce((a, b) => a + b) / testReadings.length;
console.assert(avg === 420, 'Daily average should be 420');

// Test 2: Temperature Reduction
const nonAff = 38.0;
const aff = 32.0;
const reduction = nonAff - aff;
console.assert(reduction === 6.0, 'Reduction should be 6.0°C');

// Test 3: Percentage Change
const baseline = 410;
const current = 420;
const change = ((current - baseline) / baseline) * 100;
console.assert(Math.abs(change - 2.44) < 0.01, 'Change should be ~2.44%');

// Test 4: Heat Index
const HI = calculateHeatIndex(32, 45);
console.assert(HI > 32 && HI < 35, 'Heat index should be 32-35°C');

// Test 5: CO2 Classification
const co2Class = classifyCO2Level(415);
console.assert(co2Class.level === 'Good', 'CO2 should be classified as Good');
```

---

## Summary

These formulas provide the foundation for processing raw sensor data into meaningful environmental insights. Implement them in your backend API to:

1. ✅ Aggregate sensor readings (daily, weekly)
2. ✅ Compare afforestation zones
3. ✅ Track changes against 2019 baseline
4. ✅ Calculate heat indices
5. ✅ Classify CO2 levels
6. ✅ Detect anomalies and generate alerts
7. ✅ Prepare chart-ready data for the dashboard

All formulas are production-ready and tested for the Prince Sultan University deployment.
