// ============================
// AI Chatbot Service Integration (OpenAI API)
// ============================
import { Button } from './Ui.js';
import React, { useState, useEffect } from 'react';
import { Send, Wifi } from 'lucide-react';
import { getLastValue, translations } from '../Translation.js';

const AIChatbotService = {
  // OpenAI ChatGPT API Integration (via Vercel environment)
  async queryOpenAI(message, dashboardContext, language = 'en') {
    try {
      // API key is configured through Vercel environment variables
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;

      console.log('🔑 API Key status:', apiKey ? `Found (${apiKey.substring(0, 10)}...)` : 'NOT FOUND');

      if (!apiKey) {
        console.warn('OpenAI API key not configured in environment. Falling back to manual responses.');
        return this.getFallbackResponse(message, dashboardContext, language);
      }

      const contextPrompt = this.createContextPrompt(dashboardContext, language);

      console.log('📤 Sending request to OpenAI...');

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model:"openai/gpt-oss-120b:free",
          messages: [
            {
              role: 'system',
              content: contextPrompt
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 300,
          temperature: 0.7
        })
      });

      console.log('📥 OpenAI Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ OpenAI Response data:', data);
        if (data.choices && data.choices[0] && data.choices[0].message) {
          return data.choices[0].message.content.trim();
        }
      } else {
        const errorData = await response.text();
        console.error('❌ OpenAI API Error:', response.status, response.statusText, errorData);
      }
    } catch (error) {
      console.error('❌ OpenAI API failed:', error.message);
    }

    return this.getFallbackResponse(message, dashboardContext, language);
  },

  // Create context prompt with dashboard data
  createContextPrompt(dashboardData, language) {
    const isArabic = language === 'ar';
    
    // Extract key metrics from dashboard
    const avgCO2 = dashboardData.co2Data?.length > 0 
      ? (dashboardData.co2Data.reduce((sum, item) => sum + item.value, 0) / dashboardData.co2Data.length).toFixed(1)
      : 'N/A';
    
    const currentTemp = dashboardData.heatMapData?.[0]?.temperature?.toFixed(1) || 'N/A';
    
    const airQuality = dashboardData.airQualityData?.length > 0
      ? dashboardData.airQualityData.map(item => `${item.parameter}: ${item.value}${item.unit}`).join(', ')
      : 'N/A';

    const ndvi = dashboardData.biodiversityData?.length > 0
      ? getLastValue(dashboardData.biodiversityData, language)?.ndvi?.toFixed(3)
      : 'N/A';

    if (isArabic) {
      return `أنت روضة، مساعد بيانات البيئة للرياض. البيانات الحالية:
- مستوى ثاني أكسيد الكربون: ${avgCO2} جزء في المليون
- درجة الحرارة: ${currentTemp}°م
- جودة الهواء: ${airQuality}
- مؤشر NDVI: ${ndvi}
أجب بالعربية وكن مفيداً ومختصراً.`;
    } else {
      return `You are Rawdah, an environmental data assistant for Riyadh. Current data:
- CO₂ Level: ${avgCO2} ppm
- Temperature: ${currentTemp}°C  
- Air Quality: ${airQuality}
- NDVI Index: ${ndvi}
Answer in English, be helpful and concise.`;
    }
  },

  // Intelligent fallback with dashboard data
  getFallbackResponse(message, dashboardData, language) {
    const query = message.toLowerCase();
    const isArabic = language === 'ar';

    // CO2 related queries
    if (query.includes('co2') || query.includes('carbon') || query.includes('كربون') || query.includes('أكسيد')) {
      const avgCO2 = dashboardData.co2Data?.length > 0 
        ? (dashboardData.co2Data.reduce((sum, item) => sum + item.value, 0) / dashboardData.co2Data.length).toFixed(1)
        : 'N/A';
      
      return isArabic 
        ? `مستوى ثاني أكسيد الكربون الحالي هو ${avgCO2} جزء في المليون. هدفنا تقليله بنسبة 4% من خلال التشجير والمبادرات الخضراء.`
        : `Current CO₂ level is ${avgCO2} ppm. Our target is a 4% reduction through afforestation and green initiatives.`;
    }

    // Temperature related queries
    if (query.includes('temp') || query.includes('heat') || query.includes('hot') || query.includes('cold') || query.includes('weather') || query.includes('حرارة') || query.includes('درجة') || query.includes('طقس') || query.includes('حار') || query.includes('بارد')) {
      const currentTemp = dashboardData.heatMapData?.[0]?.temperature?.toFixed(1) || 'N/A';
      
      return isArabic
        ? `درجة الحرارة الحالية ${currentTemp}°م. التشجير يساعد في تبريد المناطق الحضرية بمتوسط 2-3 درجات.`
        : `Current temperature is ${currentTemp}°C. Afforestation helps cool urban areas by an average of 2-3 degrees.`;
    }

    // Air quality related queries  
    if (query.includes('air') || query.includes('pollution') || query.includes('pm') || query.includes('aqi') || query.includes('pollut') || query.includes('هواء') || query.includes('جودة') || query.includes('تلوث') || query.includes('غبار')) {
      const hasAirData = dashboardData.airQualityData?.length > 0;
      const airQualityStatus = hasAirData ? 'monitoring active' : 'data loading';
      
      return isArabic
        ? hasAirData 
          ? `بيانات جودة الهواء متاحة للمعاينة في لوحة المعلومات. نراقب PM2.5, PM10, وملوثات أخرى. الحالة: ${airQualityStatus}`
          : `نحن نراقب جودة الهواء في الرياض باستمرار لضمان بيئة صحية. جاري تحميل البيانات...`
        : hasAirData
          ? `Air quality data is available in the dashboard. We monitor PM2.5, PM10, and other pollutants. Status: ${airQualityStatus}`
          : `We continuously monitor air quality in Riyadh to ensure a healthy environment. Loading data...`;
    }

    // NDVI/vegetation related queries
    if (query.includes('ndvi') || query.includes('vegetation') || query.includes('green') || query.includes('plant') || query.includes('tree') || query.includes('forest') || query.includes('نباتات') || query.includes('أخضر') || query.includes('شجر') || query.includes('غابة')) {
      const ndvi = dashboardData.biodiversityData?.length > 0
        ? getLastValue(dashboardData.biodiversityData, language)?.ndvi?.toFixed(3)
        : 'N/A';
      
      return isArabic
        ? `مؤشر NDVI الحالي هو ${ndvi}. هذا يقيس كثافة النباتات والغطاء الأخضر من الأقمار الصناعية.`
        : `Current NDVI index is ${ndvi}. This measures vegetation density and green cover from satellite data.`;
    }

    // Data/status related queries
    if (query.includes('data') || query.includes('status') || query.includes('update') || query.includes('latest') || query.includes('current') || query.includes('بيانات') || query.includes('حالة') || query.includes('تحديث') || query.includes('أحدث')) {
      const activeSources = Object.values(dashboardData).filter(data => data && (Array.isArray(data) ? data.length > 0 : true)).length;
      
      return isArabic
        ? `البيانات محدثة من ${activeSources} مصادر مختلفة. تشمل: مستويات CO₂، درجات الحرارة، جودة الهواء، والغطاء النباتي من الأقمار الصناعية.`
        : `Data is updated from ${activeSources} different sources. Including: CO₂ levels, temperatures, air quality, and satellite vegetation coverage.`;
    }

    // Question words - what, how, why, when
    if (query.includes('what') || query.includes('how') || query.includes('why') || query.includes('when') || query.includes('where') || query.includes('ماذا') || query.includes('كيف') || query.includes('لماذا') || query.includes('متى') || query.includes('أين')) {
      const avgCO2 = dashboardData.co2Data?.length > 0 
        ? (dashboardData.co2Data.reduce((sum, item) => sum + item.value, 0) / dashboardData.co2Data.length).toFixed(1)
        : 'N/A';
      
      return isArabic
        ? `هذه لوحة بيانات روضة للرياض. نراقب: CO₂ (${avgCO2} ppm)، درجة الحرارة، جودة الهواء، والنباتات. اسأل عن أي من هذه المواضيع!`
        : `This is the Rawdah Dashboard for Riyadh. We monitor: CO₂ (${avgCO2} ppm), temperature, air quality, and vegetation. Ask me about any of these topics!`;
    }

    // Numbers or specific values
    if (query.match(/\d+/) || query.includes('level') || query.includes('value') || query.includes('amount') || query.includes('مستوى') || query.includes('قيمة') || query.includes('كمية')) {
      const avgCO2 = dashboardData.co2Data?.length > 0 
        ? (dashboardData.co2Data.reduce((sum, item) => sum + item.value, 0) / dashboardData.co2Data.length).toFixed(1)
        : 'N/A';
      const currentTemp = dashboardData.heatMapData?.[0]?.temperature?.toFixed(1) || 'N/A';
      
      return isArabic
        ? `القيم الحالية: CO₂ ${avgCO2} ppm، الحرارة ${currentTemp}°م. هل تريد تفاصيل أكثر عن أي منها؟`
        : `Current values: CO₂ ${avgCO2} ppm, Temperature ${currentTemp}°C. Would you like more details about any of these?`;
    }

    // General greetings
    if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('good') || query.includes('مرحبا') || query.includes('أهلا') || query.includes('مساعدة') || query.includes('صباح') || query.includes('مساء')) {
      return isArabic
        ? `مرحباً! أنا روضة، مساعدتك لبيانات البيئة في الرياض. يمكنني المساعدة في تحليل بيانات ثاني أكسيد الكربون، درجة الحرارة، جودة الهواء، والغطاء النباتي.`
        : `Hello! I'm Rawdah, your environmental data assistant for Riyadh. I can help analyze CO₂ levels, temperature, air quality, and vegetation data.`;
    }

    // If message contains multiple keywords, provide comprehensive answer
    const keywordCount = (
      (query.includes('co2') || query.includes('carbon') || query.includes('كربون')) +
      (query.includes('temp') || query.includes('heat') || query.includes('حرارة')) +
      (query.includes('air') || query.includes('pollution') || query.includes('هواء')) +
      (query.includes('green') || query.includes('vegetation') || query.includes('نباتات'))
    );

    if (keywordCount >= 2) {
      const avgCO2 = dashboardData.co2Data?.length > 0 
        ? (dashboardData.co2Data.reduce((sum, item) => sum + item.value, 0) / dashboardData.co2Data.length).toFixed(1)
        : 'N/A';
      const currentTemp = dashboardData.heatMapData?.[0]?.temperature?.toFixed(1) || 'N/A';
      
      return isArabic
        ? `ملخص البيانات البيئية: CO₂ ${avgCO2} ppm، درجة الحرارة ${currentTemp}°م، مراقبة جودة الهواء نشطة، بيانات الأقمار الصناعية للنباتات متاحة.`
        : `Environmental data summary: CO₂ ${avgCO2} ppm, Temperature ${currentTemp}°C, Air quality monitoring active, Satellite vegetation data available.`;
    }

    // Default response - more engaging
    return isArabic
      ? `أهلاً! أنا هنا لمساعدتك في فهم البيانات البيئية للرياض. جرب أسئلة مثل: "كم مستوى CO₂؟" أو "ما درجة الحرارة؟" أو "كيف جودة الهواء؟"`
      : `Hello! I'm here to help you understand Riyadh's environmental data. Try questions like: "What's the CO₂ level?" or "How's the temperature?" or "How's the air quality?"`;
  },

  // Main query method - uses OpenAI API with manual fallback
  async query(message, dashboardData, language = 'en') {
    console.log('Querying OpenAI chatbot...');
    
    // Try OpenAI ChatGPT (configured via Vercel environment)
    try {
      const openAIResponse = await this.queryOpenAI(message, dashboardData, language);
      if (openAIResponse && !openAIResponse.includes('I can help analyze') && openAIResponse.length > 20) {
        console.log('✅ OpenAI ChatGPT responded');
        return openAIResponse;
      }
    } catch (error) {
      console.log('OpenAI ChatGPT unavailable, using manual fallback...', error.message);
    }

    // Fallback: Use enhanced local processing with dashboard context
    console.log('🔄 Using enhanced manual responses with dashboard data');
    return this.getFallbackResponse(message, dashboardData, language);
  },

  // No manual configuration needed
};

// Enhanced Chatbot Component with Real AI Integration
const RawdahChatbot = ({ dashboardData, isDarkMode, apiStatus, language = 'en' }) => {
  const t = translations[language];
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      type: 'bot', 
      content: translations[language].chatbotGreeting,
      timestamp: new Date() 
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Update greeting message when language changes
  useEffect(() => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === 1 
          ? { ...msg, content: translations[language].chatbotGreeting }
          : msg
      )
    );
  }, [language]);


  
  const sampleQuestions = [
    t.whatIsCO2,
    t.howToReduce,
    t.showTodayData
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
    const currentMessage = inputValue;
    setInputValue('');
    setIsTyping(true);
    
    try {
      // Use the real AI chatbot service with dashboard context
      const botResponse = await AIChatbotService.query(currentMessage, dashboardData, language);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: botResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      
      // Fallback response on error
      const fallbackResponse = language === 'ar'
        ? 'آسف، حدث خطأ في النظام. يرجى المحاولة مرة أخرى.'
        : 'Sorry, there was a system error. Please try again.';
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: fallbackResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
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
                  : isDarkMode 
                    ? 'bg-slate-700 text-slate-200' 
                    : 'bg-slate-100 text-slate-800'
              }`}
              style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
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
          <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
            🤖 AI Active
          </span>
        </div>
      </div>
      
      <div className={`p-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <p className={`text-xs mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {t.suggestedQuestions}
        </p>
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
            placeholder={t.askRawdah}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${
              isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
            }`}
            style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
          />
          <Button onClick={handleSendMessage} size="sm">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export { AIChatbotService, RawdahChatbot };