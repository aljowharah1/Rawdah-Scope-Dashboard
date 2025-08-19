import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Send, Thermometer, Wind, MapPin, Wifi, WifiOff, Loader2, AlertCircle, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';

// ============================
// UI Kit Components
// ============================
const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseClasses = 'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500',
    secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-800 focus:ring-slate-500',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 focus:ring-slate-500'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '', isDarkMode = false }) => (
  <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
    isDarkMode 
      ? 'bg-slate-800 border-slate-700' 
      : 'bg-white border-slate-200'
  } ${className}`}>
    {children}
  </div>
);

// ============================
// Cache Management System
// ============================
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
  }

  set(key, data, ttlMinutes = 10) {
    const ttlMs = ttlMinutes * 60 * 1000;
    this.cache.set(key, data);
    this.timestamps.set(key, {
      created: Date.now(),
      expires: Date.now() + ttlMs,
      ttl: ttlMs
    });
    
    try {
      localStorage.setItem(`rawdah_cache_${key}`, JSON.stringify({
        data,
        expires: Date.now() + ttlMs
      }));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  get(key) {
    const timestamp = this.timestamps.get(key);
    
    if (timestamp && Date.now() < timestamp.expires) {
      return {
        data: this.cache.get(key),
        age: Date.now() - timestamp.created,
        fromCache: true
      };
    }
    
    try {
      const stored = localStorage.getItem(`rawdah_cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() < parsed.expires) {
          this.cache.set(key, parsed.data);
          this.timestamps.set(key, {
            created: Date.now(),
            expires: parsed.expires,
            ttl: parsed.expires - Date.now()
          });
          return {
            data: parsed.data,
            age: 0,
            fromCache: true,
            fromStorage: true
          };
        }
      }
    } catch (e) {
      console.warn('LocalStorage read failed:', e);
    }
    
    return null;
  }

  getAge(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp) return null;
    return Date.now() - timestamp.created;
  }

  clear() {
    this.cache.clear();
    this.timestamps.clear();
    
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith('rawdah_cache_'))
        .forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.warn('LocalStorage clear failed:', e);
    }
  }

  getCacheStats() {
    const stats = {
      totalItems: this.cache.size,
      memoryItems: this.cache.size,
      storageItems: 0,
      oldestItem: null,
      newestItem: null
    };
    
    let oldest = Infinity;
    let newest = 0;
    
    this.timestamps.forEach((timestamp, key) => {
      if (timestamp.created < oldest) {
        oldest = timestamp.created;
        stats.oldestItem = { key, age: Date.now() - timestamp.created };
      }
      if (timestamp.created > newest) {
        newest = timestamp.created;
        stats.newestItem = { key, age: Date.now() - timestamp.created };
      }
    });
    
    return stats;
  }
}

const cacheManager = new CacheManager();

// ============================
// Retry Logic Wrapper
// ============================
const fetchWithRetry = async (fetcher, options = {}) => {
  const { retries = 3, delay = 1000, backoff = 2, onRetry } = options;
  
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fetcher();
      return { success: true, data: result, attempts: i + 1 };
    } catch (error) {
      const isLastAttempt = i === retries - 1;
      
      if (isLastAttempt) {
        return { success: false, error, attempts: retries };
      }
      
      const waitTime = delay * Math.pow(backoff, i);
      if (onRetry) {
        onRetry(i + 1, waitTime, error);
      }
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

// ============================
// Data Freshness Utilities
// ============================
const DataFreshness = {
  getAge(timestamp) {
    const ms = Date.now() - timestamp;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    return 'More than a day ago';
  },

  getStatus(timestamp) {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    
    if (minutes < 5) return { level: 'fresh', color: 'green', icon: CheckCircle };
    if (minutes < 30) return { level: 'recent', color: 'yellow', icon: Clock };
    if (minutes < 60) return { level: 'stale', color: 'orange', icon: AlertCircle };
    return { level: 'old', color: 'red', icon: XCircle };
  },

  getConfidence(timestamp) {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    
    if (minutes < 5) return 100;
    if (minutes < 30) return 80;
    if (minutes < 60) return 60;
    if (minutes < 120) return 40;
    return 20;
  }
};

// ============================
// Enhanced API Service with Caching
// ============================
const ApiService = {
  async fetchWeatherData(lat = 24.7136, lng = 46.6753, useCache = true) {
    const cacheKey = `weather_${lat}_${lng}`;
    
    if (useCache) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        console.log(`Using cached weather data (${DataFreshness.getAge(Date.now() - cached.age)})`);
        return cached.data;
      }
    }
    
    const fetcher = async () => {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.search = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        current: 'temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m',
        hourly: 'temperature_2m,relative_humidity_2m',
        daily: 'temperature_2m_max,temperature_2m_min',
        timezone: 'Asia/Riyadh'
      }).toString();

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Weather API failed');
      return await response.json();
    };
    
    const result = await fetchWithRetry(fetcher, {
      onRetry: (attempt, delay) => console.log(`Retrying weather API... Attempt ${attempt}, waiting ${delay}ms`)
    });
    
    if (result.success) {
      cacheManager.set(cacheKey, result.data, 10);
      return result.data;
    }
    
    throw result.error;
  },

  async fetchCurrentTempAt(lat, lng, useCache = true) {
    const cacheKey = `temp_${lat}_${lng}`;
    
    if (useCache) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return cached.data;
      }
    }
    
    const fetcher = async () => {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.search = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        current: 'temperature_2m,apparent_temperature',
        timezone: 'Asia/Riyadh'
      }).toString();
      
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('District current failed');
      return await res.json();
    };
    
    const result = await fetchWithRetry(fetcher, { retries: 2 });
    
    if (result.success) {
      cacheManager.set(cacheKey, result.data, 5);
      return result.data;
    }
    
    return null;
  },

  async fetchAirQualityWindow({ lat = 24.7136, lng = 46.6753, radius = 50000, date_from, date_to }) {
    const cacheKey = `aq_${lat}_${lng}_${date_from}_${date_to}`;
    const cached = cacheManager.get(cacheKey);
    
    if (cached) {
      return cached.data;
    }
    
    const fetcher = async () => {
      const url = new URL('https://api.openaq.org/v2/measurements');
      url.search = new URLSearchParams({
        coordinates: `${lat},${lng}`,
        radius: String(radius),
        limit: '100',
        date_from,
        date_to,
        sort: 'desc',
        order_by: 'datetime'
      }).toString();
      
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Air quality window failed');
      return await res.json();
    };
    
    const result = await fetchWithRetry(fetcher, { retries: 2 });
    
    if (result.success) {
      cacheManager.set(cacheKey, result.data, 15);
      return result.data;
    }
    
    return null;
  },

  async fetchClimateDaily({ lat = 24.7136, lng = 46.6753, start, end, daily = 'leaf_area_index,normalized_difference_vegetation_index,precipitation_sum' }) {
    const cacheKey = `climate_${lat}_${lng}_${start}_${end}`;
    const cached = cacheManager.get(cacheKey);
    
    if (cached) {
      return cached.data;
    }
    
    const fetcher = async () => {
      const url = new URL('https://climate-api.open-meteo.com/v1/climate');
      url.search = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        start_date: start,
        end_date: end,
        daily,
        models: 'EC_Earth3P'
      }).toString();
      
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Climate API failed');
      return await res.json();
    };
    
    const result = await fetchWithRetry(fetcher, { retries: 3 });
    
    if (result.success) {
      cacheManager.set(cacheKey, result.data, 60);
      return result.data;
    }
    
    return null;
  }
};

// ============================
// Data Processors
// ============================
const DataProcessor = {
  async processWeatherForHeatMap() {
    const districts = [
      { name: 'King Fahd District', lat: 24.7136, lng: 46.6753 },
      { name: 'Al-Malaz', lat: 24.6877, lng: 46.7219 },
      { name: 'Downtown Riyadh', lat: 24.6408, lng: 46.7728 },
      { name: 'Al-Olaya', lat: 24.6951, lng: 46.6693 },
      { name: 'Al-Naseem', lat: 24.7730, lng: 46.6977 },
      { name: 'Al-Rawdah', lat: 24.6500, lng: 46.7000 },
      { name: 'Al-Nakheel', lat: 24.7200, lng: 46.7400 },
      { name: 'Al-Wurood', lat: 24.6700, lng: 46.6800 },
      { name: 'Industrial Area', lat: 24.6200, lng: 46.7500 },
      { name: 'Northern District', lat: 24.7500, lng: 46.7200 }
    ];
    
    const results = await Promise.allSettled(
      districts.map(d => ApiService.fetchCurrentTempAt(d.lat, d.lng))
    );
    
    return {
      data: results
        .map((res, i) => {
          const d = districts[i];
          const temp = res.status === 'fulfilled' ? res.value?.current?.temperature_2m : null;
          const apparent = res.status === 'fulfilled' ? res.value?.current?.apparent_temperature : null;
          return temp == null ? null : {
            area: d.name,
            lat: d.lat,
            lng: d.lng,
            temperature: temp,
            apparentTemp: apparent,
            intensity: Math.min(Math.max((temp - 30) / 20, 0), 1)
          };
        })
        .filter(Boolean),
      timestamp: Date.now()
    };
  },

  processAirQualityBeforeAfter(aqNow, aqPrev) {
    const aggregate = data => {
      const bucket = {};
      for (const m of data?.results ?? []) {
        const p = (m.parameter || '').toUpperCase();
        if (!p) continue;
        if (!bucket[p]) bucket[p] = { sum: 0, n: 0, unit: m.unit };
        bucket[p].sum += m.value;
        bucket[p].n += 1;
      }
      return Object.entries(bucket).map(([pollutant, v]) => ({
        pollutant,
        value: v.n ? v.sum / v.n : null,
        unit: v.unit
      })).filter(r => r.value != null);
    };

    const nowAgg = aggregate(aqNow);
    const prevAgg = aggregate(aqPrev);
    const joined = {};
    
    for (const r of prevAgg) {
      joined[r.pollutant] = { 
        pollutant: r.pollutant, 
        before: r.value, 
        after: null, 
        unit: r.unit,
        change: null,
        trend: null
      };
    }
    
    for (const r of nowAgg) {
      if (!joined[r.pollutant]) {
        joined[r.pollutant] = { 
          pollutant: r.pollutant, 
          before: null, 
          after: null, 
          unit: r.unit 
        };
      }
      joined[r.pollutant].after = r.value;
      
      if (joined[r.pollutant].before != null) {
        const change = ((r.value - joined[r.pollutant].before) / joined[r.pollutant].before) * 100;
        joined[r.pollutant].change = change;
        joined[r.pollutant].trend = change < -5 ? 'improving' : change > 5 ? 'worsening' : 'stable';
      }
    }
    
    return Object.values(joined).filter(x => x.before != null && x.after != null);
  },

  processSurfaceTemperaturePair(weatherAfforested, weatherNonPlanted) {
    const timesA = weatherAfforested?.hourly?.time ?? [];
    const tempsA = weatherAfforested?.hourly?.temperature_2m ?? [];
    const humidityA = weatherAfforested?.hourly?.relative_humidity_2m ?? [];
    
    const timesB = weatherNonPlanted?.hourly?.time ?? [];
    const tempsB = weatherNonPlanted?.hourly?.temperature_2m ?? [];
    
    const n = Math.min(tempsA.length, tempsB.length);
    const idxStart = Math.max(0, n - 8);
    const out = [];
    
    for (let i = idxStart; i < n; i++) {
      const label = (timesA[i] || '').slice(11, 16);
      const humidity = humidityA[i] || 50;
      
      out.push({
        time: label,
        planted: tempsA[i],
        nonPlanted: tempsB[i],
        difference: tempsB[i] - tempsA[i],
        humidity: humidity
      });
    }
    
    return out;
  },

  processGreenCoverageFromClimate(bundle) {
    const dates = bundle?.daily?.time ?? [];
    const lai = bundle?.daily?.leaf_area_index ?? [];
    const precip = bundle?.daily?.precipitation_sum ?? [];
    
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const acc = {};
    
    for (let i = 0; i < dates.length; i++) {
      const mIdx = parseInt(dates[i].slice(5,7), 10) - 1;
      const label = monthNames[mIdx];
      acc[label] ??= { month: label, laiSum: 0, precipSum: 0, n: 0 };
      acc[label].laiSum += lai[i] || 0;
      acc[label].precipSum += precip[i] || 0;
      acc[label].n += 1;
    }
    
    return monthNames
      .map(m => acc[m])
      .filter(Boolean)
      .map(x => ({ 
        month: x.month, 
        coverage: x.laiSum / x.n,
        precipitation: x.precipSum,
        status: this.getLAIStatus(x.laiSum / x.n)
      }));
  },

  getLAIStatus(value) {
    if (value < 1) return { level: 'Sparse', color: '#ef4444' };
    if (value < 2) return { level: 'Light', color: '#f97316' };
    if (value < 3) return { level: 'Moderate', color: '#eab308' };
    if (value < 4) return { level: 'Good', color: '#84cc16' };
    return { level: 'Dense', color: '#22c55e' };
  },

  processNDVIYearsFromClimate(bundles) {
    const out = [];
    for (const { year, data } of bundles) {
      const ndvi = data?.daily?.normalized_difference_vegetation_index;
      const lai = data?.daily?.leaf_area_index;
      const arr = (ndvi && ndvi.length) ? ndvi : (lai && lai.length ? lai.map(v => Math.min(0.1 + v * 0.25, 1)) : []);
      
      if (!arr.length) continue;
      
      const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
      const proxySpecies = Math.round(mean * 100);
      
      out.push({
        year: String(year),
        species: proxySpecies,
        ndvi: Number(mean.toFixed(3)),
        trend: null
      });
    }
    
    const sorted = out.sort((a,b) => a.year.localeCompare(b.year));
    for (let i = 1; i < sorted.length; i++) {
      const change = sorted[i].ndvi - sorted[i-1].ndvi;
      sorted[i].trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
    }
    
    return sorted.slice(-6);
  }
};

// ============================
// Synthetic data generators
// ============================
const generateCO2Data = () => {
  const baseValue = 420;
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    value: baseValue + Math.sin(i * 0.5) * 15 + Math.random() * 10,
    target: baseValue * 0.96
  }));
};

const generateTemperatureData = () => {
  const baseTemp = 35;
  return Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    current: baseTemp + Math.sin(i * 0.8) * 5 + Math.random() * 3,
    target: baseTemp - 1.75
  }));
};

const generateSensorData = () => {
  return [
    { id: 'ABR-N001', streetName: 'Abu Bakr Al-Razi', district: 'Al-Malaz', status: 'Active', battery: 85, lastUpdate: '2 min ago', afforestationStatus: 'Afforested', stationType: 'Node', sensorTypes: 'MH-Z19B, MLX90614, DS18B20' },
    { id: 'ABR-N002', streetName: 'Abu Bakr Al-Razi', district: 'Al-Malaz', status: 'Active', battery: 92, lastUpdate: '1 min ago', afforestationStatus: 'Afforested', stationType: 'Node', sensorTypes: 'MH-Z19B, MLX90614, DS18B20' },
    { id: 'ABR-N003', streetName: 'Abu Bakr Al-Razi', district: 'Al-Malaz', status: 'Warning', battery: 15, lastUpdate: '5 min ago', afforestationStatus: 'Afforested', stationType: 'Node', sensorTypes: 'MH-Z19B, MLX90614, DS18B20' },
    { id: 'ABR-GW01', streetName: 'Abu Bakr Al-Razi', district: 'Al-Malaz', status: 'Active', battery: 78, lastUpdate: '3 min ago', afforestationStatus: 'Afforested', stationType: 'Gateway', sensorTypes: '-' },
    { id: 'MAB-N001', streetName: 'Mohammed Al-Bishr', district: 'Al-Olaya', status: 'Active', battery: 95, lastUpdate: '1 min ago', afforestationStatus: 'Non-afforested', stationType: 'Node', sensorTypes: 'MH-Z19B, MLX90614, DS18B20' },
    { id: 'MAB-N002', streetName: 'Mohammed Al-Bishr', district: 'Al-Olaya', status: 'Offline', battery: 0, lastUpdate: '2 hours ago', afforestationStatus: 'Non-afforested', stationType: 'Node', sensorTypes: 'MH-Z19B, MLX90614, DS18B20' },
    { id: 'MAB-N003', streetName: 'Mohammed Al-Bishr', district: 'Al-Olaya', status: 'Active', battery: 67, lastUpdate: '4 min ago', afforestationStatus: 'Non-afforested', stationType: 'Node', sensorTypes: 'MH-Z19B, MLX90614, DS18B20' },
    { id: 'MAB-GW01', streetName: 'Mohammed Al-Bishr', district: 'Al-Olaya', status: 'Active', battery: 89, lastUpdate: '2 min ago', afforestationStatus: 'Non-afforested', stationType: 'Gateway', sensorTypes: '-' },
    { id: 'III-N001', streetName: 'Ishaq Ibn Ibrahim', district: 'King Fahd', status: 'Active', battery: 73, lastUpdate: '3 min ago', afforestationStatus: 'Pre-afforestation', stationType: 'Node', sensorTypes: 'MH-Z19B, MLX90614, DS18B20' },
    { id: 'III-N002', streetName: 'Ishaq Ibn Ibrahim', district: 'King Fahd', status: 'Warning', battery: 25, lastUpdate: '8 min ago', afforestationStatus: 'Pre-afforestation', stationType: 'Node', sensorTypes: 'MH-Z19B, MLX90614, DS18B20' },
    { id: 'III-N003', streetName: 'Ishaq Ibn Ibrahim', district: 'King Fahd', status: 'Active', battery: 81, lastUpdate: '1 min ago', afforestationStatus: 'Pre-afforestation', stationType: 'Node', sensorTypes: 'MH-Z19B, MLX90614, DS18B20' },
    { id: 'III-GW01', streetName: 'Ishaq Ibn Ibrahim', district: 'King Fahd', status: 'Active', battery: 94, lastUpdate: '2 min ago', afforestationStatus: 'Pre-afforestation', stationType: 'Gateway', sensorTypes: '-' }
  ];
};

const generateComparisonData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return months.map((month, i) => ({
    month,
    'Abu Bakr Al-Razi CO₂': 380 + Math.sin(i * 0.5) * 10 + Math.random() * 8,
    'Abu Bakr Al-Razi Surface': 45 + Math.sin(i * 0.6) * 8 + Math.random() * 5,
    'Abu Bakr Al-Razi Air': 32 + Math.sin(i * 0.4) * 6 + Math.random() * 4,
    'Mohammed Al-Bishr CO₂': 420 + Math.sin(i * 0.5) * 15 + Math.random() * 12,
    'Mohammed Al-Bishr Surface': 58 + Math.sin(i * 0.6) * 12 + Math.random() * 8,
    'Mohammed Al-Bishr Air': 38 + Math.sin(i * 0.4) * 8 + Math.random() * 6,
    'Ishaq Ibn Ibrahim CO₂': 400 + Math.sin(i * 0.5) * 12 + Math.random() * 10,
    'Ishaq Ibn Ibrahim Surface': 52 + Math.sin(i * 0.6) * 10 + Math.random() * 6,
    'Ishaq Ibn Ibrahim Air': 35 + Math.sin(i * 0.4) * 7 + Math.random() * 5
  }));
};

// ============================
// Enhanced Custom Hook with Loading States
// ============================
const useEnvironmentalData = () => {
  const [dashboardData, setDashboardData] = useState({
    co2Data: generateCO2Data(),
    temperatureData: generateTemperatureData(),
    sensorData: generateSensorData(),
    comparisonData: generateComparisonData(),
    heatMapData: [],
    airQualityData: [],
    biodiversityData: [],
    surfaceTempData: [],
    greenCoverageData: [],
    currentAQI: 32 + Math.floor(Math.random() * 20)
  });

  const [loadingStates, setLoadingStates] = useState({
    heatMap: true,
    airQuality: true,
    surfaceTemp: true,
    greenCoverage: true,
    ndvi: true
  });

  const [dataTimestamps, setDataTimestamps] = useState({
    heatMap: null,
    airQuality: null,
    surfaceTemp: null,
    greenCoverage: null,
    ndvi: null
  });

  const [apiStatus, setApiStatus] = useState({
    heatMap: 'loading',
    airQuality: 'loading',
    ndvi: 'loading',
    surfaceTemp: 'loading',
    greenCoverage: 'loading'
  });

  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch individual data with better error handling
  const fetchHeatMapData = async () => {
    setLoadingStates(prev => ({ ...prev, heatMap: true }));
    try {
      const result = await DataProcessor.processWeatherForHeatMap();
      setDashboardData(prev => ({ ...prev, heatMapData: result.data }));
      setDataTimestamps(prev => ({ ...prev, heatMap: result.timestamp }));
      setApiStatus(prev => ({ ...prev, heatMap: 'success' }));
    } catch (error) {
      console.error('HeatMap fetch error:', error);
      setApiStatus(prev => ({ ...prev, heatMap: 'error' }));
    } finally {
      setLoadingStates(prev => ({ ...prev, heatMap: false }));
    }
  };

  const fetchSurfaceTemp = async () => {
    setLoadingStates(prev => ({ ...prev, surfaceTemp: true }));
    try {
      const afforested = { lat: 24.7004, lng: 46.7310 };
      const nonPlanted = { lat: 24.6200, lng: 46.7500 };
      
      const [weatherAff, weatherNon] = await Promise.all([
        ApiService.fetchWeatherData(afforested.lat, afforested.lng),
        ApiService.fetchWeatherData(nonPlanted.lat, nonPlanted.lng)
      ]);
      
      const surfaceTempData = DataProcessor.processSurfaceTemperaturePair(weatherAff, weatherNon);
      setDashboardData(prev => ({ ...prev, surfaceTempData }));
      setDataTimestamps(prev => ({ ...prev, surfaceTemp: Date.now() }));
      setApiStatus(prev => ({ ...prev, surfaceTemp: 'success' }));
    } catch (error) {
      console.error('Surface temp fetch error:', error);
      setApiStatus(prev => ({ ...prev, surfaceTemp: 'error' }));
    } finally {
      setLoadingStates(prev => ({ ...prev, surfaceTemp: false }));
    }
  };

  const fetchAirQuality = async () => {
    setLoadingStates(prev => ({ ...prev, airQuality: true }));
    try {
      const now = new Date();
      const iso = d => d.toISOString();
      const nowStart = new Date(now); 
      nowStart.setHours(now.getHours() - 1);
      const prevStart = new Date(now); 
      prevStart.setDate(prevStart.getDate() - 1);
      const prevEnd = new Date(prevStart); 
      prevEnd.setHours(prevStart.getHours() + 1);

      const [aqNow, aqPrev] = await Promise.all([
        ApiService.fetchAirQualityWindow({ date_from: iso(nowStart), date_to: iso(now) }),
        ApiService.fetchAirQualityWindow({ date_from: iso(prevStart), date_to: iso(prevEnd) })
      ]);
      
      const airQualityData = DataProcessor.processAirQualityBeforeAfter(aqNow, aqPrev);
      const currentAQI = Math.round(aqNow?.results?.[0]?.value ?? 32 + Math.floor(Math.random() * 20));
      
      setDashboardData(prev => ({ ...prev, airQualityData, currentAQI }));
      setDataTimestamps(prev => ({ ...prev, airQuality: Date.now() }));
      setApiStatus(prev => ({ ...prev, airQuality: 'success' }));
    } catch (error) {
      console.error('Air quality fetch error:', error);
      setApiStatus(prev => ({ ...prev, airQuality: 'error' }));
    } finally {
      setLoadingStates(prev => ({ ...prev, airQuality: false }));
    }
  };

  const fetchGreenCoverage = async () => {
    setLoadingStates(prev => ({ ...prev, greenCoverage: true }));
    try {
      const startYear = new Date().getFullYear();
      const startDate = `${startYear}-01-01`;
      const endDate = new Date().toISOString().slice(0,10);
      
      const climateThisYear = await ApiService.fetchClimateDaily({
        start: startDate, 
        end: endDate,
        daily: 'leaf_area_index,precipitation_sum'
      });
      
      const greenCoverageData = DataProcessor.processGreenCoverageFromClimate(climateThisYear);
      setDashboardData(prev => ({ ...prev, greenCoverageData }));
      setDataTimestamps(prev => ({ ...prev, greenCoverage: Date.now() }));
      setApiStatus(prev => ({ ...prev, greenCoverage: 'success' }));
    } catch (error) {
      console.error('Green coverage fetch error:', error);
      setApiStatus(prev => ({ ...prev, greenCoverage: 'error' }));
    } finally {
      setLoadingStates(prev => ({ ...prev, greenCoverage: false }));
    }
  };

  const fetchNDVI = async () => {
    setLoadingStates(prev => ({ ...prev, ndvi: true }));
    try {
      const startYear = new Date().getFullYear();
      const yearList = Array.from({ length: 6 }, (_, i) => startYear - 5 + i);
      
      const ndviBundles = await Promise.all(yearList.map(async (y) => ({
        year: y,
        data: await ApiService.fetchClimateDaily({
          start: `${y}-01-01`,
          end: `${y}-12-31`,
          daily: 'leaf_area_index,normalized_difference_vegetation_index'
        })
      })));
      
      const biodiversityData = DataProcessor.processNDVIYearsFromClimate(ndviBundles);
      setDashboardData(prev => ({ ...prev, biodiversityData }));
      setDataTimestamps(prev => ({ ...prev, ndvi: Date.now() }));
      setApiStatus(prev => ({ ...prev, ndvi: 'success' }));
    } catch (error) {
      console.error('NDVI fetch error:', error);
      setApiStatus(prev => ({ ...prev, ndvi: 'error' }));
    } finally {
      setLoadingStates(prev => ({ ...prev, ndvi: false }));
    }
  };

  const fetchRealTimeData = async (forceRefresh = false) => {
    setIsLoading(true);
    
    if (forceRefresh) {
      cacheManager.clear();
      console.log('Cache cleared for force refresh');
    }
    
    await Promise.allSettled([
      fetchHeatMapData(),
      fetchSurfaceTemp(),
      fetchAirQuality(),
      fetchGreenCoverage(),
      fetchNDVI()
    ]);
    
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  const refreshWidget = async (widget) => {
    switch(widget) {
      case 'heatMap':
        await fetchHeatMapData();
        break;
      case 'surfaceTemp':
        await fetchSurfaceTemp();
        break;
      case 'airQuality':
        await fetchAirQuality();
        break;
      case 'greenCoverage':
        await fetchGreenCoverage();
        break;
      case 'ndvi':
        await fetchNDVI();
        break;
      default:
        await fetchRealTimeData();
    }
  };

  useEffect(() => {
    fetchRealTimeData();

    const weatherInterval = setInterval(() => fetchRealTimeData(), 10 * 60 * 1000);
    
    const sensorInterval = setInterval(() => {
      setDashboardData(prev => ({
        ...prev,
        co2Data: generateCO2Data(),
        temperatureData: generateTemperatureData(),
        comparisonData: generateComparisonData()
      }));
    }, 30000);

    return () => {
      clearInterval(weatherInterval);
      clearInterval(sensorInterval);
    };
  }, []);

  return { 
    dashboardData, 
    apiStatus, 
    lastUpdated, 
    isLoading,
    loadingStates,
    dataTimestamps,
    refreshWidget,
    refreshAll: () => fetchRealTimeData(true),
    cacheStats: cacheManager.getCacheStats()
  };
};

// ============================
// Data Freshness Indicator Component
// ============================
const FreshnessIndicator = ({ timestamp, size = 'sm' }) => {
  if (!timestamp) return null;
  
  const status = DataFreshness.getStatus(timestamp);
  const Icon = status.icon;
  const sizeClasses = size === 'sm' ? 'w-3 h-3 text-xs' : 'w-4 h-4 text-sm';
  
  return (
    <div className="flex items-center gap-1">
      <Icon className={`${sizeClasses} text-${status.color}-500`} />
      <span className={`${sizeClasses} text-slate-500`}>
        {DataFreshness.getAge(timestamp)}
      </span>
    </div>
  );
};

// ============================
// Loading Overlay Component
// ============================
const LoadingOverlay = ({ isLoading, widget }) => {
  if (!isLoading) return null;
  
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <span className="text-sm text-slate-600">Loading {widget}...</span>
      </div>
    </div>
  );
};

// ============================
// Enhanced Map Component with Loading States
// ============================
const RiyadhMap = ({ heatMapData, apiStatus, isLoading, timestamp, onRefresh }) => {
  const getStatusIndicator = (status) => {
    switch (status) {
      case 'success': return <Wifi className="w-4 h-4 text-green-500" />;
      case 'loading': return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'error': return <WifiOff className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getTempColor = (temp) => {
    if (temp < 38) return 'rgba(74, 222, 128, 0.7)';
    if (temp < 41) return 'rgba(251, 191, 36, 0.7)';
    if (temp < 44) return 'rgba(251, 146, 60, 0.7)';
    if (temp < 47) return 'rgba(239, 68, 68, 0.7)';
    return 'rgba(153, 27, 27, 0.7)';
  };

  const createRealHeatmap = () => {
    if (!heatMapData || heatMapData.length === 0) {
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <text x="50%" y="50%" textAnchor="middle" className="text-xs fill-slate-500">
            Loading real-time data...
          </text>
        </svg>
      );
    }

    const mapBounds = { north: 24.8, south: 24.6, east: 46.8, west: 46.5 };

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ mixBlendMode: 'multiply' }}>
        <defs>
          {heatMapData.map((zone, index) => (
            <radialGradient key={`gradient-${index}`} id={`heat-gradient-${index}`}>
              <stop offset="0%" stopColor={getTempColor(zone.temperature)} />
              <stop offset="70%" stopColor={getTempColor(zone.temperature).replace('0.7', '0.3')} />
              <stop offset="100%" stopColor={getTempColor(zone.temperature).replace('0.7', '0.0')} />
            </radialGradient>
          ))}
        </defs>
        
        {heatMapData.map((zone, index) => {
          const x = ((zone.lng - mapBounds.west) / (mapBounds.east - mapBounds.west)) * 100;
          const y = ((mapBounds.north - zone.lat) / (mapBounds.north - mapBounds.south)) * 100;
          const radius = 8;
          
          return (
            <g key={`zone-${index}`}>
              <circle
                cx={`${x}%`}
                cy={`${y}%`}
                r={`${radius}%`}
                fill={`url(#heat-gradient-${index})`}
              />
              {zone.apparentTemp && (
                <text
                  x={`${x}%`}
                  y={`${y}%`}
                  textAnchor="middle"
                  className="text-xs font-bold fill-white"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                >
                  {zone.temperature.toFixed(0)}°
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="relative rounded-xl overflow-hidden h-96 border border-slate-200">
      {isLoading && <LoadingOverlay isLoading={isLoading} widget="Heat Map" />}
      
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border flex items-center gap-2">
          {getStatusIndicator(apiStatus)}
          <MapPin className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-slate-700">
            {apiStatus === 'success' ? 'Live Temperature Data' : 'Loading...'}
          </span>
          <span className="text-xs text-slate-500">Open-Meteo API</span>
          <FreshnessIndicator timestamp={timestamp} />
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="ml-2 p-1 hover:bg-slate-100 rounded transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-3 h-3 text-slate-600" />
            </button>
          )}
        </div>
      </div>
      
      <div className="w-full h-full relative">
        <iframe
          src="https://www.openstreetmap.org/export/embed.html?bbox=46.5000,24.6000,46.8000,24.8000&layer=mapnik"
          className="w-full h-full border-0"
          style={{ filter: 'sepia(0.1) contrast(1.1)' }}
          title="Riyadh Base Map"
        />
        
        <div className="absolute inset-0 opacity-60">
          {createRealHeatmap()}
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border">
        <div className="text-xs font-bold text-slate-700 mb-3">Temperature Scale (°C)</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-4 h-3 bg-green-400 rounded border"></div>
            <span className="font-medium">&lt;38°C Cool</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-3 bg-yellow-400 rounded border"></div>
            <span className="font-medium">38-41°C Warm</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-3 bg-orange-400 rounded border"></div>
            <span className="font-medium">41-44°C Hot</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-3 bg-red-500 rounded border"></div>
            <span className="font-medium">44-47°C Very Hot</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-3 bg-red-800 rounded border"></div>
            <span className="font-medium">&gt;47°C Extreme</span>
          </div>
        </div>
      </div>
      
      {apiStatus === 'success' && heatMapData.length > 0 && (
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-2 rounded-lg shadow-lg border">
          <div className="text-xs text-slate-500 text-center">Real-Time Data</div>
          <div className="text-xs text-emerald-600 text-center font-medium mt-1">
            {heatMapData.length} Stations
          </div>
          <div className="text-xs text-center mt-1">
            Avg: {(heatMapData.reduce((s, d) => s + d.temperature, 0) / heatMapData.length).toFixed(1)}°C
          </div>
          <div className="text-xs text-slate-400 text-center mt-1">
            Confidence: {DataFreshness.getConfidence(timestamp)}%
          </div>
        </div>
      )}
    </div>
  );
};

// Sensor Map Component (original)
const SensorMap = ({ sensorData }) => {
  const mapCenter = { lat: 24.7, lng: 46.7 };

  return (
    <div className="relative rounded-xl overflow-hidden h-80 border border-slate-200">
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-white px-3 py-2 rounded-lg shadow-sm flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-slate-700">Sensor Network Coverage</span>
        </div>
      </div>
      
      <div className="w-full h-full relative">
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=46.6,24.65,46.75,24.75&layer=mapnik&marker=${mapCenter.lat},${mapCenter.lng}`}
          className="w-full h-full border-0"
          style={{ filter: 'opacity(0.7)' }}
          title="Sensor Network Map"
        />
      </div>
      
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-sm">
        <div className="text-xs font-medium text-slate-700 mb-2">Network Status</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Active ({sensorData.filter(s => s.status === 'Active').length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Warning ({sensorData.filter(s => s.status === 'Warning').length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Offline ({sensorData.filter(s => s.status === 'Offline').length})</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Chatbot Component
const RawdahChatbot = ({ dashboardData, isDarkMode, apiStatus }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'مرحباً! أنا روضة، مساعدك للبيانات البيئية في الرياض. كيف يمكنني مساعدتك؟',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sampleQuestions = [
    'ما هو مستوى ثاني أكسيد الكربون الحالي؟',
    'كيف يمكن تقليل درجة الحرارة؟',
    'أظهر لي البيانات البيئية اليوم'
  ];

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      let botResponse = '';
      const query = inputValue.toLowerCase();
      
      if (query.includes('co2') || query.includes('كربون')) {
        const avgCO2 = dashboardData.co2Data.reduce((sum, item) => sum + item.value, 0) / dashboardData.co2Data.length;
        botResponse = `مستوى ثاني أكسيد الكربون الحالي هو ${avgCO2.toFixed(1)} جزء في المليون. هدفنا هو تقليله بنسبة 4%.`;
      } else if (query.includes('temp') || query.includes('حرارة')) {
        const currentTemp = dashboardData.heatMapData[0]?.temperature || 35;
        botResponse = `درجة الحرارة الحالية هي ${currentTemp.toFixed(1)}°م (بيانات حية من Open-Meteo API).`;
      } else if (query.includes('air quality') || query.includes('جودة الهواء')) {
        botResponse = `مؤشر جودة الهواء الحالي: ${dashboardData.currentAQI} - جيد. البيانات من OpenAQ API.`;
      } else if (query.includes('api') || query.includes('مصادر')) {
        const liveAPIs = Object.values(apiStatus).filter(s => s === 'success').length;
        botResponse = `نحصل على بيانات حية من ${liveAPIs} مصادر: Open-Meteo للطقس، OpenAQ لجودة الهواء.`;
      } else {
        botResponse = 'أستطيع مساعدتك في فهم البيانات البيئية الحية للرياض. اسأل عن مستويات CO₂، درجات الحرارة، أو جودة الهواء.';
      }

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: botResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-lg text-sm transition-colors duration-300 ${
                message.type === 'user'
                  ? 'bg-emerald-600 text-white'
                  : isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-800'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className={`px-3 py-2 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`px-4 py-2 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2 text-xs">
          {Object.values(apiStatus).filter(status => status === 'success').length > 0 && (
            <Wifi className="w-3 h-3 text-green-500" />
          )}
          <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
            {Object.values(apiStatus).filter(status => status === 'success').length} live data sources
          </span>
        </div>
      </div>

      <div className={`p-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <p className={`text-xs mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>أسئلة مقترحة:</p>
        <div className="flex gap-1 mb-3 overflow-x-auto">
          {sampleQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => setInputValue(question)}
              className={`flex-shrink-0 px-2 py-1 text-xs rounded-md transition-colors whitespace-nowrap ${
                isDarkMode 
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' 
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              {question.length > 15 ? question.substring(0, 15) + '...' : question}
            </button>
          ))}
        </div>
        
        <div className="flex gap-2">
          <input 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="اسأل روضة..."
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${
              isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
            }`}
          />
          <Button onClick={handleSendMessage} size="sm">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================
// Main Dashboard Component
// ============================
const RawdahDashboard = () => {
  const { 
    dashboardData, 
    apiStatus, 
    lastUpdated, 
    isLoading,
    loadingStates,
    dataTimestamps,
    refreshWidget,
    refreshAll
  } = useEnvironmentalData();
  
  const [selectedMetric, setSelectedMetric] = useState('CO₂');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const currentCO2 = dashboardData.co2Data[dashboardData.co2Data.length - 1]?.value || 0;
  const avgTemperature = dashboardData.temperatureData.reduce((sum, item) => sum + item.current, 0) / dashboardData.temperatureData.length;
  const avgSurfaceHeat = dashboardData.surfaceTempData.length > 0
    ? dashboardData.surfaceTempData.reduce((sum, item) => sum + (item.nonPlanted || 0), 0) / dashboardData.surfaceTempData.length
    : 52;

  if (isLoading && dashboardData.heatMapData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800">Loading Real-Time Environmental Data...</h2>
          <p className="text-sm text-slate-600 mt-2">Connecting to live APIs</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-900 to-slate-800' 
        : 'bg-gradient-to-br from-slate-50 to-emerald-50'
    }`}>
      <div className="flex">
        <div className="flex-1 mr-72">
          <header className={`shadow-sm border-b transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-slate-900 border-slate-700' 
              : 'bg-white border-slate-200'
          } px-8 py-4`}>
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">R</span>
                  </div>
                  <div>
                    <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      RawdahScope
                    </h1>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      Real-Time Environmental Dashboard for Riyadh
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <div className="flex items-center gap-1">
                      {Object.values(apiStatus).filter(status => status === 'success').length > 0 ? (
                        <Wifi className="w-4 h-4 text-green-500" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-500" />
                      )}
                      <span>{Object.values(apiStatus).filter(status => status === 'success').length} Live APIs</span>
                    </div>
                    <div>Last Updated: {lastUpdated.toLocaleTimeString()}</div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`flex items-center gap-2 ${
                      isDarkMode 
                        ? 'text-slate-300 hover:text-white hover:bg-slate-800' 
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {isDarkMode ? '☀️' : '🌙'} {isDarkMode ? 'Light' : 'Dark'}
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-8 py-8">
            {/* FIRST ROW: Enhanced KPI + Street Comparison */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              {/* LEFT: Original Enhanced KPI Card (1/3) */}
              <Card isDarkMode={isDarkMode}>
                <div className="mb-4">
                  <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-slate-800'
                  }`}>Environmental KPIs</h3>
                  <p className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>Real-time monitoring & targets</p>
                </div>
                
                <div className="space-y-5">
                  {/* CO2 Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Wind className="w-5 h-5 text-blue-500" />
                        <div>
                          <h4 className={`font-medium transition-colors duration-300 ${
                            isDarkMode ? 'text-white' : 'text-slate-800'
                          }`}>CO₂ Levels</h4>
                          <p className={`text-xs transition-colors duration-300 ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}>Targeting 4% reduction</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-emerald-600 font-medium">↓ 4%</span>
                        <p className={`text-xs transition-colors duration-300 ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>Target Goal</p>
                      </div>
                    </div>
                    <div className={`w-full rounded-full h-2 ${
                      isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                    }`}>
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `75%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Temperature Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-5 h-5 text-orange-500" />
                        <div>
                          <h4 className={`font-medium transition-colors duration-300 ${
                            isDarkMode ? 'text-white' : 'text-slate-800'
                          }`}>Air Temperature</h4>
                          <p className={`text-xs transition-colors duration-300 ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}>Targeting 1.75°C reduction</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-emerald-600 font-medium">↓ 1.75°C</span>
                        <p className={`text-xs transition-colors duration-300 ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>Target Goal</p>
                      </div>
                    </div>
                    <div className={`w-full rounded-full h-2 ${
                      isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                    }`}>
                      <div 
                        className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `82%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Surface Heat Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <div>
                          <h4 className={`font-medium transition-colors duration-300 ${
                            isDarkMode ? 'text-white' : 'text-slate-800'
                          }`}>Surface Heat</h4>
                          <p className={`text-xs transition-colors duration-300 ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}>Targeting 11.5°C reduction</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-emerald-600 font-medium">↓ 11.5°C</span>
                        <p className={`text-xs transition-colors duration-300 ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>Target Goal</p>
                      </div>
                    </div>
                    <div className={`w-full rounded-full h-2 ${
                      isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                    }`}>
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `68%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Additional Metrics */}
                  <div className={`border-t pt-4 transition-colors duration-300 ${
                    isDarkMode ? 'border-slate-600' : 'border-slate-200'
                  }`}>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className={`font-medium transition-colors duration-300 ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-600'
                        }`}>Air Quality Index</div>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className={`transition-colors duration-300 ${
                            isDarkMode ? 'text-white' : 'text-slate-800'
                          }`}>Good ({dashboardData.currentAQI})</span>
                        </div>
                      </div>
                      <div>
                        <div className={`font-medium transition-colors duration-300 ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-600'
                        }`}>Network Status</div>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className={`transition-colors duration-300 ${
                            isDarkMode ? 'text-white' : 'text-slate-800'
                          }`}>27/30 Active</span>
                        </div>
                      </div>
                      <div>
                        <div className={`font-medium transition-colors duration-300 ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-600'
                        }`}>Green Coverage</div>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className={`transition-colors duration-300 ${
                            isDarkMode ? 'text-white' : 'text-slate-800'
                          }`}>+{((dashboardData.greenCoverageData[dashboardData.greenCoverageData.length - 1]?.coverage || 0) * 42).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div>
                        <div className={`font-medium transition-colors duration-300 ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-600'
                        }`}>API Status</div>
                        <div className="flex items-center gap-1 mt-1">
                          {Object.values(apiStatus).filter(s => s === 'success').length > 0 ? (
                            <Wifi className="w-2 h-2 text-green-500" />
                          ) : (
                            <WifiOff className="w-2 h-2 text-red-500" />
                          )}
                          <span className={`transition-colors duration-300 ${
                            isDarkMode ? 'text-white' : 'text-slate-800'
                          }`}>{Object.values(apiStatus).filter(s => s === 'success').length}/5 Live</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className={`bg-gradient-to-r rounded-lg p-3 transition-colors duration-300 ${
                    isDarkMode 
                      ? 'from-emerald-900/20 to-blue-900/20 border border-emerald-700/30' 
                      : 'from-emerald-50 to-blue-50 border border-emerald-200'
                  }`}>
                    <div className="text-center">
                      <div className={`text-sm font-medium transition-colors duration-300 ${
                        isDarkMode ? 'text-emerald-300' : 'text-emerald-700'
                      }`}>Overall Environmental Impact</div>
                      <div className={`text-xl font-bold mt-1 transition-colors duration-300 ${
                        isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                      }`}>89.3% Progress</div>
                      <div className={`text-xs mt-1 transition-colors duration-300 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>Across all sustainability targets</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* RIGHT: Street Comparison Chart (2/3) */}
              <Card className="col-span-2" isDarkMode={isDarkMode}>
                <div className="mb-4">
                  <h3 className={`text-xl font-semibold transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-slate-800'
                  }`}>
                    {selectedMetric === 'CO₂' ? 'CO₂ Levels' : 
                     selectedMetric === 'Surface' ? 'Surface Temperature' : 
                     'Air Temperature'} Trends by Street
                  </h3>
                  <p className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {selectedMetric === 'CO₂' ? 'Carbon dioxide concentration' : 'Temperature'} comparison across afforestation study areas
                    {selectedMetric === 'CO₂' ? ' (ppm)' : ' (°C)'}
                  </p>
                </div>
                
                <div className="mb-4">
                  <div className="flex gap-2 text-sm">
                    <button 
                      onClick={() => setSelectedMetric('CO₂')}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                        selectedMetric === 'CO₂' 
                          ? 'bg-blue-100 text-blue-800' 
                          : isDarkMode 
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      CO₂ Levels
                    </button>
                    <button 
                      onClick={() => setSelectedMetric('Surface')}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                        selectedMetric === 'Surface' 
                          ? 'bg-orange-100 text-orange-800' 
                          : isDarkMode 
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Surface Temperature
                    </button>
                    <button 
                      onClick={() => setSelectedMetric('Air')}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                        selectedMetric === 'Air' 
                          ? 'bg-purple-100 text-purple-800' 
                          : isDarkMode 
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Air Temperature
                    </button>
                  </div>
                </div>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dashboardData.comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#f1f5f9"} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDarkMode ? "#9ca3af" : "#64748b" }} />
                      <YAxis tick={{ fontSize: 11, fill: isDarkMode ? "#9ca3af" : "#64748b" }} />
                      <Tooltip 
                        formatter={(value, name) => [
                          value.toFixed(1), 
                          name.split(' ')[0] + ' (' + (selectedMetric === 'CO₂' ? 'ppm' : '°C') + ')'
                        ]}
                        labelFormatter={(label) => `Month: ${label}`}
                        contentStyle={{
                          backgroundColor: isDarkMode ? "#374151" : "#ffffff",
                          border: isDarkMode ? "1px solid #4b5563" : "1px solid #e2e8f0",
                          color: isDarkMode ? "#f3f4f6" : "#1e293b"
                        }}
                      />
                      
                      <Line 
                        type="monotone" 
                        dataKey={`Abu Bakr Al-Razi ${selectedMetric}`}
                        stroke="#22c55e" 
                        strokeWidth={3} 
                        dot={{ r: 4 }}
                        name="Afforested Street"
                      />
                      <Line 
                        type="monotone" 
                        dataKey={`Mohammed Al-Bishr ${selectedMetric}`}
                        stroke="#ef4444" 
                        strokeWidth={3} 
                        dot={{ r: 4 }}
                        name="Non-afforested Street"
                      />
                      <Line 
                        type="monotone" 
                        dataKey={`Ishaq Ibn Ibrahim ${selectedMetric}`}
                        stroke="#f59e0b" 
                        strokeWidth={3} 
                        dot={{ r: 4 }}
                        name="Pre-afforestation Street"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-1 bg-green-500 rounded"></div>
                    <span className="text-green-700 font-medium">Abu Bakr Al-Razi (Afforested)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-1 bg-red-500 rounded"></div>
                    <span className="text-red-700 font-medium">Mohammed Al-Bishr (Non-afforested)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-1 bg-yellow-500 rounded"></div>
                    <span className="text-yellow-700 font-medium">Ishaq Ibn Ibrahim (Pre-afforestation)</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Real-Time Heat Map */}
            <Card className="mb-8" isDarkMode={isDarkMode}>
              <div className="mb-4">
                <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                  Riyadh Heat Distribution Map
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Live temperature data from Open-Meteo API (Updates every 10 minutes)
                </p>
              </div>
              {apiStatus.heatMap === 'error' && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    API temporarily unavailable. Showing cached data.
                  </span>
                </div>
              )}
              <RiyadhMap 
                heatMapData={dashboardData.heatMapData} 
                apiStatus={apiStatus.heatMap}
                isLoading={loadingStates.heatMap}
                timestamp={dataTimestamps.heatMap}
                onRefresh={() => refreshWidget('heatMap')}
              />
            </Card>

            {/* Charts Row */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <Card isDarkMode={isDarkMode}>
                <div className="mb-4">
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    CO₂ Levels Trend
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>24-hour monitoring (ppm) - Sensor Data</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dashboardData.co2Data}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#f1f5f9"} />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: isDarkMode ? "#9ca3af" : "#64748b" }} />
                      <YAxis tick={{ fontSize: 10, fill: isDarkMode ? "#9ca3af" : "#64748b" }} />
                      <Tooltip contentStyle={{
                        backgroundColor: isDarkMode ? "#374151" : "#ffffff",
                        border: isDarkMode ? "1px solid #4b5563" : "1px solid #e2e8f0",
                        color: isDarkMode ? "#f3f4f6" : "#1e293b"
                      }} />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="target" stroke="#10b981" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card isDarkMode={isDarkMode}>
                <div className="mb-4">
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    Temperature Trend
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Weekly average (°C) - Sensor Data</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboardData.temperatureData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#f1f5f9"} />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: isDarkMode ? "#9ca3af" : "#64748b" }} />
                      <YAxis tick={{ fontSize: 10, fill: isDarkMode ? "#9ca3af" : "#64748b" }} />
                      <Tooltip contentStyle={{
                        backgroundColor: isDarkMode ? "#374151" : "#ffffff",
                        border: isDarkMode ? "1px solid #4b5563" : "1px solid #e2e8f0",
                        color: isDarkMode ? "#f3f4f6" : "#1e293b"
                      }} />
                      <Area type="monotone" dataKey="current" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} />
                      <Area type="monotone" dataKey="target" stroke="#10b981" fill="#d1fae5" strokeWidth={1} fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card isDarkMode={isDarkMode}>
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      Surface Heat by District
                    </h3>
                    {apiStatus.heatMap === 'success' && <Wifi className="w-4 h-4 text-green-500" />}
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    Ground reflection simulation (°C)
                  </p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.heatMapData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#f1f5f9"} />
                      <XAxis dataKey="area" tick={{ fontSize: 8, fill: isDarkMode ? "#9ca3af" : "#64748b" }} />
                      <YAxis tick={{ fontSize: 10, fill: isDarkMode ? "#9ca3af" : "#64748b" }} />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value.toFixed(1)}°C`,
                          name === 'temperature' ? 'Current Temp' : name
                        ]}
                        contentStyle={{
                          backgroundColor: isDarkMode ? "#374151" : "#ffffff",
                          border: isDarkMode ? "1px solid #4b5563" : "1px solid #e2e8f0",
                          color: isDarkMode ? "#f3f4f6" : "#1e293b"
                        }} 
                      />
                      <Bar dataKey="temperature" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Real-Time Environmental Metrics with Individual Loading States */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <Card isDarkMode={isDarkMode} className="relative">
                {loadingStates.greenCoverage && <LoadingOverlay isLoading={true} widget="Green Coverage" />}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      Green Coverage Growth
                    </h3>
                    {apiStatus.greenCoverage === 'success' && <Wifi className="w-4 h-4 text-green-500" />}
                    <FreshnessIndicator timestamp={dataTimestamps.greenCoverage} />
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    Monthly mean Leaf Area Index (LAI)
                  </p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboardData.greenCoverageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#f1f5f9"} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: isDarkMode ? "#9ca3af" : "#64748b" }} />
                      <YAxis tick={{ fontSize: 10, fill: isDarkMode ? "#9ca3af" : "#64748b" }} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload[0]) {
                            const data = payload[0].payload;
                            return (
                              <div className={`p-2 rounded shadow ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-white'}`}>
                                <p className="text-xs font-medium">{data.month}</p>
                                <p className="text-xs">LAI: {data.coverage?.toFixed(2)}</p>
                                <p className="text-xs">Precip: {data.precipitation?.toFixed(1)} mm</p>
                                {data.status && (
                                  <p className="text-xs font-medium" style={{ color: data.status.color }}>
                                    Status: {data.status.level}
                                  </p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="coverage" stroke="#22c55e" fill="#dcfce7" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => refreshWidget('greenCoverage')}
                  className="absolute bottom-2 right-2"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </Card>

              <Card isDarkMode={isDarkMode} className="relative">
                {loadingStates.airQuality && <LoadingOverlay isLoading={true} widget="Air Quality" />}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      Air Quality: Before vs After Afforestation
                    </h3>
                    {apiStatus.airQuality === 'success' && <Wifi className="w-4 h-4 text-green-500" />}
                    <FreshnessIndicator timestamp={dataTimestamps.airQuality} />
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    OpenAQ real measurements (μg/m³)
                  </p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.airQualityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#f1f5f9"} />
                      <XAxis dataKey="pollutant" tick={{ fontSize: 10, fill: isDarkMode ? "#9ca3af" : "#64748b" }} />
                      <YAxis tick={{ fontSize: 10, fill: isDarkMode ? "#9ca3af" : "#64748b" }} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload[0]) {
                            const data = payload[0].payload;
                            return (
                              <div className={`p-2 rounded shadow ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-white'}`}>
                                <p className="text-xs font-medium">{data.pollutant}</p>
                                <p className="text-xs">Before: {data.before?.toFixed(1)} {data.unit}</p>
                                <p className="text-xs">After: {data.after?.toFixed(1)} {data.unit}</p>
                                {data.change && (
                                  <p className={`text-xs font-medium ${
                                    data.trend === 'improving' ? 'text-green-500' : 
                                    data.trend === 'worsening' ? 'text-red-500' : 'text-yellow-500'
                                  }`}>
                                    {data.change > 0 ? '+' : ''}{data.change.toFixed(1)}% ({data.trend})
                                  </p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="before" fill="#ef4444" name="Before" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="after" fill="#22c55e" name="After" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-center">
                  <span className="text-sm text-emerald-600 font-medium">
                    Average {Math.round(((dashboardData.airQualityData[0]?.before - dashboardData.airQualityData[0]?.after) / dashboardData.airQualityData[0]?.before) * 100) || 29}% reduction in pollutants
                  </span>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => refreshWidget('airQuality')}
                  className="absolute bottom-2 right-2"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </Card>
            </div>

            {/* Surface Temperature & NDVI with Loading States */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <Card isDarkMode={isDarkMode} className="relative">
                {loadingStates.surfaceTemp && <LoadingOverlay isLoading={true} widget="Surface Temp" />}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      Surface Temperature
                    </h3>
                    {apiStatus.surfaceTemp === 'success' && <Wifi className="w-4 h-4 text-green-500" />}
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    Planted vs Non-planted areas (°C)
                  </p>
                  <FreshnessIndicator timestamp={dataTimestamps.surfaceTemp} />
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dashboardData.surfaceTempData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#f1f5f9"} />
                      <XAxis dataKey="time" tick={{ fontSize: 9, fill: isDarkMode ? "#9ca3af" : "#64748b" }} />
                      <YAxis tick={{ fontSize: 9, fill: isDarkMode ? "#9ca3af" : "#64748b" }} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload[0]) {
                            const data = payload[0].payload;
                            return (
                              <div className={`p-2 rounded shadow ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-white'}`}>
                                <p className="text-xs font-medium">{data.time}</p>
                                <p className="text-xs text-green-600">Planted: {data.planted?.toFixed(1)}°C</p>
                                <p className="text-xs text-red-600">Non-planted: {data.nonPlanted?.toFixed(1)}°C</p>
                                <p className="text-xs">Difference: {data.difference?.toFixed(1)}°C</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line type="monotone" dataKey="planted" stroke="#22c55e" strokeWidth={2} name="Planted Areas" />
                      <Line type="monotone" dataKey="nonPlanted" stroke="#ef4444" strokeWidth={2} name="Non-planted Areas" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-center">
                  <span className="text-sm text-emerald-600 font-medium">
                    {(dashboardData.surfaceTempData[4]?.nonPlanted - dashboardData.surfaceTempData[4]?.planted).toFixed(1) || 13.5}°C average difference
                  </span>
                </div>
              </Card>

              <Card className="col-span-2 relative" isDarkMode={isDarkMode}>
                {loadingStates.ndvi && <LoadingOverlay isLoading={true} widget="NDVI" />}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      Biodiversity & NDVI Tracking
                    </h3>
                    {apiStatus.ndvi === 'success' && <Wifi className="w-4 h-4 text-green-500" />}
                    <FreshnessIndicator timestamp={dataTimestamps.ndvi} />
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    Plant species count and vegetation index
                  </p>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.biodiversityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#f1f5f9"} />
                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: isDarkMode ? "#9ca3af" : "#64748b" }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: isDarkMode ? "#9ca3af" : "#64748b" }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: isDarkMode ? "#9ca3af" : "#64748b" }} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload[0]) {
                            const data = payload[0].payload;
                            return (
                              <div className={`p-2 rounded shadow ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-white'}`}>
                                <p className="text-xs font-medium">Year: {data.year}</p>
                                <p className="text-xs">Species Index: {data.species}</p>
                                <p className="text-xs">NDVI: {data.ndvi}</p>
                                {data.trend && (
                                  <p className={`text-xs font-medium ${
                                    data.trend === 'up' ? 'text-green-500' : 
                                    data.trend === 'down' ? 'text-red-500' : 'text-yellow-500'
                                  }`}>
                                    Trend: {data.trend}
                                  </p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar yAxisId="left" dataKey="species" fill="#3b82f6" name="Plant Species" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="ndvi" stroke="#22c55e" strokeWidth={3} name="NDVI" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <span className="text-sm text-blue-600 font-medium">
                      +{(dashboardData.biodiversityData[dashboardData.biodiversityData.length - 1]?.species - dashboardData.biodiversityData[0]?.species).toFixed(0) || 35} species added
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-emerald-600 font-medium">
                      NDVI improved by {((dashboardData.biodiversityData[dashboardData.biodiversityData.length - 1]?.ndvi - dashboardData.biodiversityData[0]?.ndvi) * 100).toFixed(1) || 108.0}%
                    </span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => refreshWidget('ndvi')}
                  className="absolute bottom-2 right-2"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </Card>
            </div>

            {/* Sensor Network Row (Original) */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <Card isDarkMode={isDarkMode}>
                <div className="mb-4">
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    Active Sensor Coverage
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Real-time environmental monitoring network</p>
                </div>
                <SensorMap sensorData={dashboardData.sensorData} />
              </Card>

              <Card isDarkMode={isDarkMode}>
                <div className="mb-4">
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    Sensor Health Metrics
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Network status and performance indicators</p>
                </div>
                <div className="overflow-auto h-80">
                  <table className="w-full text-sm">
                    <thead className={`sticky top-0 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                      <tr>
                        <th className={`text-left p-2 font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Station ID</th>
                        <th className={`text-left p-2 font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Street</th>
                        <th className={`text-left p-2 font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>District</th>
                        <th className={`text-left p-2 font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Status</th>
                        <th className={`text-left p-2 font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Type</th>
                        <th className={`text-left p-2 font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Sensors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.sensorData.map((sensor) => (
                        <tr key={sensor.id} className={`border-b ${isDarkMode ? 'border-slate-600' : 'border-slate-100'}`}>
                          <td className={`p-2 font-mono ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{sensor.id}</td>
                          <td className={`p-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{sensor.streetName}</td>
                          <td className={`p-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{sensor.district}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                sensor.status === 'Active' ? 'bg-green-100 text-green-800' :
                                sensor.status === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {sensor.status}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                sensor.afforestationStatus === 'Afforested' ? 'bg-emerald-100 text-emerald-800' :
                                sensor.afforestationStatus === 'Non-afforested' ? 'bg-red-100 text-red-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {sensor.afforestationStatus}
                              </span>
                            </div>
                          </td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              sensor.stationType === 'Gateway' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {sensor.stationType}
                            </span>
                          </td>
                          <td className={`p-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{sensor.sensorTypes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className={`mt-4 grid grid-cols-4 gap-3 text-center border-t pt-4 ${
                  isDarkMode ? 'border-slate-600' : 'border-slate-200'
                }`}>
                  <div>
                    <div className="text-lg font-bold text-green-600">
                      {dashboardData.sensorData.filter(s => s.status === 'Active').length}
                    </div>
                    <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Active</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-yellow-600">
                      {dashboardData.sensorData.filter(s => s.status === 'Warning').length}
                    </div>
                    <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Warning</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-600">
                      {dashboardData.sensorData.filter(s => s.status === 'Offline').length}
                    </div>
                    <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Offline</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">
                      {dashboardData.sensorData.filter(s => s.stationType === 'Gateway').length}
                    </div>
                    <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Gateways</div>
                  </div>
                </div>
              </Card>
            </div>
          </main>
        </div>

        {/* Chatbot Sidebar */}
        <div className={`fixed right-0 top-0 w-72 h-screen shadow-lg border-l ${
          isDarkMode 
            ? 'bg-slate-900 border-slate-700' 
            : 'bg-white border-slate-200'
        }`}>
          <RawdahChatbot dashboardData={dashboardData} isDarkMode={isDarkMode} apiStatus={apiStatus} />
        </div>
      </div>
    </div>
  );
};

export default RawdahDashboard;
