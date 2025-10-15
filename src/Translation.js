
// ============================
// Translation System & RTL Support
// ============================

// Translation mappings for chart data labels
const chartDataTranslations = {
  // Days of the week
  days: {
    en: { Sun: 'Sun', Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat' },
    ar: { Sun: 'الأحد', Mon: 'الاثنين', Tue: 'الثلاثاء', Wed: 'الأربعاء', Thu: 'الخميس', Fri: 'الجمعة', Sat: 'السبت' }
  },
  // Months
  months: {
    en: { Jan: 'Jan', Feb: 'Feb', Mar: 'Mar', Apr: 'Apr', May: 'May', Jun: 'Jun', Jul: 'Jul', Aug: 'Aug', Sep: 'Sep', Oct: 'Oct', Nov: 'Nov', Dec: 'Dec' },
    ar: { Jan: 'يناير', Feb: 'فبراير', Mar: 'مارس', Apr: 'أبريل', May: 'مايو', Jun: 'يونيو', Jul: 'يوليو', Aug: 'أغسطس', Sep: 'سبتمبر', Oct: 'أكتوبر', Nov: 'نوفمبر', Dec: 'ديسمبر' }
  },
  // Air quality parameters
  parameters: {
    en: { 'PM2.5': 'PM2.5', 'PM10': 'PM10', 'NO2': 'NO₂', 'O3': 'O₃', 'SO2': 'SO₂', 'CO': 'CO' },
    ar: { 'PM2.5': 'PM2.5', 'PM10': 'PM10', 'NO2': 'NO₂', 'O3': 'O₃', 'SO2': 'SO₂', 'CO': 'CO' }
  },
  // Area names for ground temperature chart
  areas: {
    en: { 'Al-Malaz': 'Al-Malaz', 'Industrial Area': 'Industrial Area', 'Al-Ghadeer': 'Al-Ghadeer' },
    ar: { 'Al-Malaz': 'الملز', 'Industrial Area': 'الصناعية', 'Al-Ghadeer': 'الغدير' }
  }
};

// Helper function to translate chart data labels
const translateChartLabel = (label, type, language) => {
  if (language === 'en') return label;
  
  const translations = chartDataTranslations[type];
  if (translations && translations[language] && translations[language][label]) {
    return translations[language][label];
  }
  
  return label; // Return original if no translation found
};

// Helper function to get the last (most recent) value from data regardless of display order
const getLastValue = (data, language = 'en') => {
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  
  // Always get the last chronological value (before any display reversing)
  return data[data.length - 1];
};

// Helper function to translate chart data labels for RTL languages (Arabic)
// The XAxis reversed prop handles the RTL layout, so we don't reverse the data array
const prepareChartData = (data, isArabic = false, language = 'en') => {
  if (!data || !Array.isArray(data)) return data;

  // Clone the data to avoid mutation
  let processedData = data.map(item => ({ ...item }));

  // Translate labels based on the data structure
  if (language === 'ar') {
    processedData = processedData.map(item => {
      const translatedItem = { ...item };

      // Translate day labels (used in CO2, temperature, and surface temp data)
      if (item.day && chartDataTranslations.days.ar[item.day]) {
        translatedItem.day = chartDataTranslations.days.ar[item.day];
      }

      // Translate month labels (used in comparison data)
      if (item.month && chartDataTranslations.months.ar[item.month]) {
        translatedItem.month = chartDataTranslations.months.ar[item.month];
      }

      // Translate parameter labels (used in air quality data)
      if (item.parameter && chartDataTranslations.parameters.ar[item.parameter]) {
        translatedItem.parameter = chartDataTranslations.parameters.ar[item.parameter];
      }

      // Translate area labels (used in ground temperature data)
      if (item.area && chartDataTranslations.areas.ar[item.area]) {
        translatedItem.area = chartDataTranslations.areas.ar[item.area];
      }

      return translatedItem;
    });
  }

  // Return the data without reversing - the XAxis reversed prop handles RTL layout
  return processedData;
};

const translations = {
  en: {
    // Main titles
    title: 'RawdahScope',
    subtitle: 'Real-Time Environmental Dashboard for Riyadh',

    // KPI section
    environmentalKPIs: 'Environmental KPIs',
    realtimeMonitoring: 'Real-time monitoring & targets',
    co2Levels: 'CO₂ Levels',
    targetingReduction: 'Targeting 4% reduction',
    airTemperature: 'Air Temperature',
    targetingTempReduction: 'Targeting 1.75°C reduction',
    surfaceHeat: 'Surface Heat',
    targetingSurfaceReduction: 'Targeting 11.5°C reduction',
    airQualityIndex: 'Air Quality Index',
    networkStatus: 'Network Status',
    apiStatus: 'API Status',
    overallImpact: 'Overall Environmental Impact',
    progress: 'Progress',
    sustainabilityTargets: 'Across all sustainability targets',

    // Status indicators
    liveAPIs: 'Live APIs',
    lastUpdated: 'Last Updated',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    active: 'Active',
    warning: 'Warning',
    offline: 'Offline',
    good: 'Good',
    fetchingData: 'Fetching...',

    // Graph titles and descriptions
    co2LevelsTrend: 'CO₂ Levels Trend',
    co2TrendDesc: 'Weekly monitoring (ppm) - Sensor Data',
    temperatureTrend: 'Temperature Trend',
    tempTrendDesc: 'Weekly average (°C) - Sensor Data',
    surfaceHeatByDistrict: 'Surface Heat by District',
    surfaceHeatDesc: 'Ground temperature (°C) - Sensor Data',
    airQualityComparison: 'Air Quality: Before vs After Afforestation',
    airQualityDesc: 'OpenAQ real-time measurements (μg/m³)',
    treeCoverLoss: 'Forest Area Coverage',
    treeCoverLossDesc: 'World Bank official forest statistics for Saudi Arabia (hectares)',
    carbonSequestrationKPI: 'CO₂ Reduction KPI',
    carbonSequestrationDesc: 'Forest carbon absorption tracking from FAO, Global Forest Watch & World Bank data',
    surfaceTemperature: 'Surface Temperature',
    surfaceTempCompareDesc: 'Al-Malaz (Afforested) vs Industrial Area (Non-afforested)',
    biodiversityTracking: 'NDVI Satellite Tracking',
    biodiversityDesc: 'Real satellite vegetation index for Riyadh from NASA MODIS & Copernicus (24.7136°N, 46.6753°E)',
    sensorHealthMetrics: 'Sensor Health Metrics',
    sensorHealthDesc: 'Network status and performance indicators',

    // Street comparison
    trends: 'Trends by Street',
    co2LevelsTitle: 'CO₂ Levels',
    surfaceTemperatureTitle: 'Surface Temperature',
    airTemperatureTitle: 'Air Temperature',
    carbonDioxideConcentration: 'Carbon dioxide concentration',
    temperatureComparison: 'Temperature comparison across afforestation study areas',

    // Map section
    heatDistribution: 'Riyadh Heat Distribution Map',
    liveTemperatureData: 'Live Temperature Data',
    liveTemperatureDesc: 'Live temperature data from Open-Meteo API (Updates every 10 minutes)',
    loading: 'Loading',
    temperatureScale: 'Temperature Scale',
    sensorNetwork: 'Active Sensor Coverage',
    sensorNetworkCoverage: 'Sensor Network Coverage',
    realTimeEnvironmental: 'Real-time environmental monitoring network',

    // Chart labels  
    current: 'Current',
    forecasted: 'Forecasted',

    // Sensor table headers
    stationId: 'Station ID',
    street: 'Street',
    district: 'District',
    status: 'Status',
    type: 'Type',
    sensors: 'Sensors',
    gateways: 'Gateways',

    // API and data status
    weatherApiUnavailable: 'Weather API temporarily unavailable',
    loadingTemperatureData: 'Loading temperature data...',
    loadingDistrictData: 'Loading district data...',
    fetchingFromWeatherApi: 'Fetching from weather API',
    noDataAvailable: 'No data available for selected time range',
    loadingAirQualityData: 'Loading air quality data...',
    connectingToOpenAQ: 'Connecting to OpenAQ API',
    retry: 'Retry',
    realTimeAirQuality: 'Real-time air quality data',
    stationsActive: 'Stations Active',
    average: 'Average',
    range: 'Range',

    // Improvements and targets
    targetGoal: 'Target Goal',
    speciesAdded: 'species added',
    ndviImprovedBy: 'NDVI improved by',
    averageDifference: 'average difference',

    // Chatbot
    chatbotGreeting: 'Hello! I am Rawdah, your environmental data assistant for Riyadh. How can I help you?',
    askRawdah: 'Ask Rawdah...',
    suggestedQuestions: 'Suggested questions:',
    whatIsCO2: 'What is the current CO₂ level?',
    howToReduce: 'How can we reduce temperature?',
    showTodayData: "Show me today's environmental data",
    liveDataSources: 'live data sources',

    // Data labels
    before: 'Before',
    after: 'After',
    beforeAfforestation: 'Before Afforestation',
    afterAfforestation: 'After Afforestation',
    afforestedStreet: 'Afforested Street',
    nonAfforestedStreet: 'Non-afforested Street',
    preAfforestationStreet: 'Pre-afforestation Street',

    // Temperature categories
    cool: 'Cool',
    mild: 'Mild',
    warm: 'Warm',
    hot: 'Hot',
    veryHot: 'Very Hot',
    extreme: 'Extreme',

    // Additional UI elements
    live: 'Live',
    updating: 'Updates every 10 minutes',
    showingCachedData: 'Showing cached data',
    concentration: 'Concentration',
    better: 'Better',
    worse: 'Worse',
    stable: 'Stable',
    month: 'Month',
    year: 'Year',
    day: 'Day',
    coverage: 'Coverage',
    precipitation: 'Precip',
    speciesIndex: 'Species Index',
    trend: 'Trend',
    up: 'up',
    down: 'down',
    difference: 'Difference',
    target: 'Target',

    // Loading states
    connectingToAPI: 'Connecting to API',
    realTimeData: 'Real-time Data',

    // UI Labels that were hardcoded
    networkStatusLabel: 'Network Status',
    realTimeEnvironmentalMonitoring: 'Real-time environmental monitoring network',
    networkStatusPerformance: 'Network status and performance indicators',
    stationID: 'Station ID',
    streetName: 'Street',
    districtName: 'District',
    sensorStatus: 'Status',
    sensorType: 'Type',
    sensorsCount: 'Sensors',
    gatewaysCount: 'Gateways',
    
    // Hardcoded location names
    abuBakrAlRaziAfforested: 'Abu Bakr Al-Razi (Afforested)',
    mohammedAlBishrNonAfforested: 'Mohammed Al-Bishr (Non-afforested)',
    ishaqIbnIbrahimPreAfforestation: 'Ishaq Ibn Ibrahim (Pre-afforestation)',
    
    // Chart and data labels
    weeklyAverage: 'Weekly average (°C) - Sensor Data',
    currentTemp: 'Current Temp',
    mmUnit: 'mm',
    
    // Status indicators
    noLiveData: 'No Live Data',
    beforeValue: 'Before:',
    afterValue: 'After:',
    industrialAreaTemp: 'Industrial:',
    temperatureDifference: 'Difference:',
    yearLabel: 'Year:',
    speciesIndexLabel: 'Species Index:',
    ndviLabel: 'NDVI:',
    
    // Loading states for specific widgets
    loadingWidget: 'Loading',
    connectingToLiveAPIs: 'Connecting to live APIs',
    loadingRealTimeEnvironmentalData: 'Loading Real-Time Environmental Data...',
    
    // OpenMeteo API reference
    openMeteoAPI: 'Open-Meteo API',
    
    // Widget names for loading
    heatMap: 'Heat Map',
    airQualityWidget: 'Air Quality',
    surfaceTemp: 'Surface Temp',
    treeCoverLossWidget: 'Forest Coverage',
    
    // Status counts
    activeCount: 'Active',
    warningCount: 'Warning',
    offlineCount: 'Offline',
    
    // Target goal labels for KPI cards
    targetGoalLabel: 'Target Goal',
    
    // Status label for tooltips
    statusLabel: 'Status'
  },

 ar: {
    // Main titles
    title: 'روضة سكوب',
    subtitle: 'لوحة معلومات بيئية لمدينة الرياض',

    // KPI section
    environmentalKPIs: 'مؤشرات الأداء البيئية',
    realtimeMonitoring: 'المراقبة في الوقت الحقيقي و الأهداف',
    co2Levels: 'مستويات ثاني أكسيد الكربون',
    targetingReduction: 'الهدف: خفض بنسبة 4٪',
    airTemperature: 'درجة حرارة الهواء',
    targetingTempReduction: 'الهدف: خفض بمقدار 1.75°م',
    surfaceHeat: 'حرارة السطح',
    targetingSurfaceReduction: 'الهدف: خفض بمقدار 11.5°م',
    airQualityIndex: 'مؤشر جودة الهواء',
    networkStatus: 'حالة الشبكة',
    apiStatus: 'حالة واجهات البرمجة (API)',
    overallImpact: 'الأثر البيئي الكلي',
    progress: 'التقدم',
    sustainabilityTargets: 'عبر جميع أهداف الاستدامة',

    // Status indicators
    liveAPIs: 'واجهات برمجة فعّالة',
    lastUpdated: 'آخر تحديث',
    lightMode: 'الوضع الفاتح',
    darkMode: 'الوضع الداكن',
    active: 'نشط',
    warning: 'تحذير',
    offline: 'غير متصل',
    good: 'جيد',
    fetchingData: 'جارٍ الجلب...',

    // Graph titles and descriptions
    co2LevelsTrend: 'اتجاه مستويات ثاني أكسيد الكربون',
    co2TrendDesc: 'مراقبة أسبوعية (جزء في المليون) - بيانات المستشعر',
    temperatureTrend: 'اتجاه درجة الحرارة',
    tempTrendDesc: 'متوسط أسبوعي (°م) - بيانات المستشعر',
    surfaceHeatByDistrict: 'حرارة السطح حسب الحي',
    surfaceHeatDesc: 'درجة حرارة الأرض (°م) - بيانات المستشعر',
    airQualityComparison: 'جودة الهواء: قبل التشجير وبعده',
    airQualityDesc: 'قياسات OpenAQ في الوقت الحقيقي (ميكروغرام/م³)',
    treeCoverLoss: 'تغطية المساحة الحرجية',
    treeCoverLossDesc: 'إحصائيات البنك الدولي الرسمية للغابات في السعودية (هكتار)',
    carbonSequestrationKPI: 'مؤشر خفض ثاني أكسيد الكربون',
    carbonSequestrationDesc: 'تتبع امتصاص الكربون من بيانات الفاو ومراقب الغابات العالمي والبنك الدولي',
    surfaceTemperature: 'درجة حرارة السطح',
    surfaceTempCompareDesc: 'الملز (مشجَّر) مقابل المنطقة الصناعية (غير مشجَّر)',
    biodiversityTracking: 'تتبّع مؤشر NDVI بالأقمار الصناعية',
    biodiversityDesc: 'مؤشر الغطاء النباتي الحقيقي للرياض من الأقمار الصناعية NASA MODIS & Copernicus (24.7136°شمال، 46.6753°شرق)',
    sensorHealthMetrics: 'مؤشرات صحة المستشعرات',
    sensorHealthDesc: 'حالة الشبكة ومؤشرات الأداء',

    // Street comparison
    trends: 'حسب الشارع',
    co2LevelsTitle: 'مستويات ثاني أكسيد الكربون',
    surfaceTemperatureTitle: 'درجة حرارة السطح',
    airTemperatureTitle: 'درجة حرارة الهواء',
    carbonDioxideConcentration: 'تركيز ثاني أكسيد الكربون',
    temperatureComparison: 'مقارنة درجات الحرارة عبر مناطق دراسة التشجير',

    // Map section
    heatDistribution: 'خريطة توزيع الحرارة في الرياض',
    liveTemperatureData: 'بيانات درجة الحرارة المباشرة',
    liveTemperatureDesc: 'بيانات درجة الحرارة المباشرة من Open-Meteo API (تحديث كل 10 دقائق)',
    loading: 'جارٍ التحميل',
    temperatureScale: 'مقياس درجة الحرارة',
    sensorNetwork: 'تغطية المستشعرات النشطة',
    sensorNetworkCoverage: 'تغطية شبكة المستشعرات',
    realTimeEnvironmental: 'شبكة مراقبة بيئية في الوقت الحقيقي',

    // Chart labels
    forecasted: 'متوقع',

    // Sensor table headers
    stationId: 'معرّف المحطة',
    street: 'الشارع',
    district: 'الحي',
    status: 'الحالة',
    type: 'النوع',
    sensors: 'المستشعرات',
    gateways: 'البوابات',

    // API and data status
    weatherApiUnavailable: 'واجهة برمجة الطقس غير متاحة مؤقتًا',
    loadingTemperatureData: 'جارٍ تحميل بيانات درجة الحرارة...',
    loadingDistrictData: 'جارٍ تحميل بيانات الأحياء...',
    fetchingFromWeatherApi: 'جارٍ الجلب من واجهة برمجة الطقس',
    noDataAvailable: 'لا تتوفر بيانات للنطاق الزمني المحدد',
    loadingAirQualityData: 'جارٍ تحميل بيانات جودة الهواء...',
    connectingToOpenAQ: 'جارٍ الاتصال بواجهة OpenAQ',
    retry: 'إعادة المحاولة',
    realTimeAirQuality: 'بيانات جودة الهواء في الوقت الحقيقي',
    stationsActive: 'محطات نشطة',
    average: 'المتوسط',
    range: 'النطاق',

    // Improvements and targets
    targetGoal: 'الهدف',
    speciesAdded: 'أنواع مُضافة',
    ndviImprovedBy: 'تحسّن مؤشر NDVI بنسبة',
    averageDifference: 'متوسط الفارق',

    // Chatbot
    chatbotGreeting: 'مرحبًا! أنا روضة، مساعدتك لبيانات البيئة في الرياض. كيف يمكنني المساعدة؟',
    askRawdah: 'اسأل روضة...',
    suggestedQuestions: 'أسئلة مقترحة:',
    whatIsCO2: 'ما مستوى ثاني أكسيد الكربون الحالي؟',
    howToReduce: 'كيف يمكن خفض درجة الحرارة؟',
    showTodayData: 'اعرض بيانات اليوم البيئية',
    liveDataSources: 'مصادر بيانات مباشرة',

    // Data labels
    before: 'قبل',
    after: 'بعد',
    beforeAfforestation: 'قبل التشجير',
    afterAfforestation: 'بعد التشجير',
    afforestedStreet: 'شارع مُشجَّر',
    nonAfforestedStreet: 'شارع غير مُشجَّر',
    preAfforestationStreet: 'شارع قبل التشجير',

    // Temperature categories
    cool: 'بارد',
    mild: 'معتدل',
    warm: 'دافئ',
    hot: 'حار',
    veryHot: 'حار جدًا',
    extreme: 'شديد الحرارة',

    // Additional UI elements
    live: 'مباشر',
    updating: 'يُحدَّث كل 10 دقائق',
    showingCachedData: 'يتم عرض بيانات مخزّنة مؤقتًا',
    concentration: 'التركيز',
    better: 'أفضل',
    worse: 'أسوأ',
    stable: 'مستقر',
    month: 'الشهر',
    year: 'السنة',
    day: 'اليوم',
    coverage: 'التغطية',
    precipitation: 'الهطول',
    speciesIndex: 'مؤشر الأنواع',
    trend: 'الاتجاه',
    up: 'صاعد',
    down: 'هابط',
    difference: 'الفرق',
    current: 'الحالي',
    target: 'الهدف',

    // Real-time data labels
    realTimeAirQualityData: 'بيانات جودة الهواء في الوقت الفعلي',
    
    // Chart specific labels
    hourMonitoring: 'مراقبة على مدار الساعة',
    sensorData24: 'بيانات المستشعر-24',
    
    // District names (for heat map)
    alMalaz: 'الملز',
    industrialArea: 'المنطقة الصناعية',
    alGhadeer: 'الغدير',
    kingFahdDistrict: 'حي الملك فهد',
    alOlaya: 'العليا',
    alNaseem: 'النسيم',
    northernDistrict: 'الحي الشمالي',
    qurtubah: 'قرطبة',
    diriyah: 'الدرعية',
    alShifa: 'الشفاء',
    
    // Street names
    abuBakrAlRazi: 'أبو بكر الرازي',
    mohammedAlBishr: 'محمد البشر',
    ishaqIbnIbrahim: 'إسحاق بن إبراهيم',
    
    // Planted/Non-planted labels
    planted: 'مُشجَّر',
    nonPlanted: 'غير مُشجَّر',
    afforested: 'مُشجَّر',
    nonAfforested: 'غير مُشجَّر',
    preAfforestation: 'قبل التشجير',
    
    // Time labels for charts
    justNow: 'الآن',
    minutesAgo: 'منذ {n} دقائق',
    hoursAgo: 'منذ {n} ساعات',
    
    // Chart comparison labels
    comparisonAcrossAreas: 'مقارنة عبر مناطق دراسة التشجير',
    concentrationComparison: 'مقارنة التركيز',
    
    // Units
    ppm: 'جزء في المليون',
    celsius: '°م',
    fahrenheit: '°ف',
    microgram: 'ميكروغرام/م³',
    mgm3: 'ملغ/م³',
    
    // Additional status labels
    fetchingFromAPI: 'جارٍ الجلب من واجهة البرمجة',
    apiTemporarilyUnavailable: 'واجهة البرمجة غير متاحة مؤقتاً',
    
    // Sensor types
    node: 'عقدة',
    gateway: 'بوابة',
    
    // Battery status
    battery: 'البطارية',
    lastUpdate: 'آخر تحديث',
    
    // Network coverage
    activeSensorCoverage: 'تغطية المستشعرات النشطة',
    
    // Biodiversity specific
    plantSpecies: 'أنواع النباتات',
    vegetationIndex: 'مؤشر الغطاء النباتي',
    
    // Weather
    humidity: 'الرطوبة',
    windSpeed: 'سرعة الرياح',
    
    // Trends
    improving: 'تحسُّن',
    worsening: 'تدهور',
    
    // Pollutants
    pm25: 'الجسيمات الدقيقة PM2.5',
    pm10: 'الجسيمات PM10',
    no2: 'ثاني أكسيد النيتروجين',
    o3: 'الأوزون',
    so2: 'ثاني أكسيد الكبريت',
    co: 'أول أكسيد الكربون',
    
    // Loading states
    connectingToAPI: 'جارٍ الاتصال بواجهة البرمجة',
    realTimeData: 'بيانات في الوقت الحقيقي',

    // UI Labels that were hardcoded
    networkStatusLabel: 'حالة الشبكة',
    realTimeEnvironmentalMonitoring: 'شبكة مراقبة بيئية في الوقت الحقيقي',
    networkStatusPerformance: 'حالة الشبكة ومؤشرات الأداء',
    stationID: 'معرّف المحطة',
    streetName: 'الشارع',
    districtName: 'الحي',
    sensorStatus: 'الحالة',
    sensorType: 'النوع',
    sensorsCount: 'المستشعرات',
    gatewaysCount: 'البوابات',

    // Hardcoded location names
    abuBakrAlRaziAfforested: 'أبو بكر الرازي (مُشجَّر)',
    mohammedAlBishrNonAfforested: 'محمد البشر (غير مُشجَّر)',
    ishaqIbnIbrahimPreAfforestation: 'إسحاق بن إبراهيم (قبل التشجير)',

    // Chart and data labels
    weeklyAverage: 'متوسط أسبوعي (°م) - بيانات المستشعر',
    mmUnit: 'ملم',
    
    // Status indicators
    noLiveData: 'لا توجد بيانات مباشرة',
    beforeValue: 'قبل:',
    afterValue: 'بعد:',
    industrialAreaTemp: 'الصناعية:',
    temperatureDifference: 'الفرق:',
    yearLabel: 'السنة:',
    speciesIndexLabel: 'مؤشر الأنواع:',
    ndviLabel: 'مؤشر NDVI:',
    
    // Loading states for specific widgets
    loadingWidget: 'جارٍ التحميل',
    connectingToLiveAPIs: 'جارٍ الاتصال بواجهات البرمجة المباشرة',
    loadingRealTimeEnvironmentalData: 'جارٍ تحميل البيانات البيئية الآنية...',
    
    // OpenMeteo API reference
    openMeteoAPI: 'واجهة OpenMeteo API',
    
    // Widget names for loading
    heatMap: 'خريطة الحرارة',
    airQualityWidget: 'جودة الهواء',
    surfaceTemp: 'درجة حرارة السطح',
    treeCoverLossWidget: 'التغطية الحرجية',
    
    // Status counts
    activeCount: 'نشط',
    warningCount: 'تحذير', 
    offlineCount: 'غير متصل',
    
    // Target goal labels for KPI cards
    targetGoalLabel: 'الهدف',
    
    // Status label for tooltips
    statusLabel: 'الحالة'
  }
};
export { chartDataTranslations, translateChartLabel, getLastValue, prepareChartData,translations};