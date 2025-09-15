# 🤖 AI Chatbot Setup Instructions

Your Rawdah Dashboard now supports **real AI chatbots** with ChatGPT and Claude!

## ✅ What's Been Implemented

- **OpenAI ChatGPT Integration** (GPT-3.5-turbo)
- **Anthropic Claude Integration** (Claude-3-haiku)  
- **Dashboard Context** - AI knows your real environmental data
- **Multilingual Support** - Arabic and English responses
- **Automatic Fallback** - Smart local responses if no API key

## 🔑 Getting API Keys

### Option 1: OpenAI ChatGPT (Recommended)
1. Go to: https://platform.openai.com/api-keys
2. Sign up/login and create a new API key
3. Copy the key starting with `sk-...`
4. **Cost**: ~$0.002 per conversation (~500 conversations per $1)

### Option 2: Anthropic Claude
1. Go to: https://console.anthropic.com/
2. Sign up/login and create a new API key  
3. Copy the key starting with `sk-ant-...`
4. **Cost**: Similar pricing to ChatGPT

## 🚀 How to Use

1. **Open the Dashboard** - Your app is running at http://localhost:3000
2. **Click the Chatbot** - Bottom right corner
3. **Click "⚙️ AI Setup"** - In the chatbot status bar
4. **Paste Your API Key** - Either OpenAI or Claude
5. **Click Save** - Keys are stored locally in your browser
6. **Start Chatting!** - Ask complex questions about your data

## 💬 Example Questions to Try

**English:**
- "Analyze the relationship between CO₂ levels and temperature trends"
- "What environmental improvements should we prioritize?"
- "Explain the NDVI satellite data in simple terms"
- "How do afforested areas compare to non-planted areas?"

**Arabic:**
- "حلل العلاقة بين مستويات ثاني أكسيد الكربون ودرجة الحرارة"
- "ما التحسينات البيئية التي يجب أن نعطيها الأولوية؟"
- "اشرح بيانات الأقمار الصناعية NDVI بطريقة بسيطة"

## 🛡️ Privacy & Security

- **Local Storage**: API keys are stored only in your browser
- **No Server**: Keys never leave your computer
- **Dashboard Context**: AI gets your environmental data for better responses
- **Real-time**: AI responds with current data from your dashboard

## 🔄 Fallback System

If no API keys are configured, the chatbot uses enhanced local processing:
- Still answers questions about your data
- Uses real CO₂, temperature, air quality, and NDVI values
- Smart keyword detection in Arabic and English
- Not as comprehensive as real AI, but functional

## 🆘 Troubleshooting

**"API key not found"**: Make sure you pasted the full key and clicked Save
**"API Error"**: Check your API key is valid and has credits
**No response**: Check browser console (F12) for error details
**Fallback responses**: Your API might be out of credits or invalid

---

**Ready to use real AI with your environmental data!** 🌱🤖