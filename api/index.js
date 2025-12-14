
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

// Updated Key provided by user
const apiKey = process.env.API_KEY || "AIzaSyCOGUM81Ex7pU_-QSFPgx3bdo_eQDAAfj0";

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedDomains = ['https://pyqverse.in', 'https://www.pyqverse.in', 'https://pyqverse.vercel.app'];
    if (allowedDomains.includes(origin) || origin.endsWith('.vercel.app') || origin.includes('localhost')) return callback(null, true);
    return callback(new Error('CORS Blocked'), false);
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate Limit (Basic IP limiting)
const requestCounts = new Map();
const rateLimiter = (req, res, next) => {
  let forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) forwarded = forwarded[0];
  const ip = (forwarded || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  if (!requestCounts.has(ip)) requestCounts.set(ip, { count: 1, startTime: now });
  else {
    const data = requestCounts.get(ip);
    if (now - data.startTime > 60000) { data.count = 1; data.startTime = now; }
    else {
      data.count++;
      if (data.count > 100) return res.status(429).json({ success: false, error: "Too many requests." });
    }
  }
  next();
};

const router = express.Router();
router.use('/ai', rateLimiter);

router.post('/ai/generate', async (req, res) => {
  try {
    if (!ai) return res.status(500).json({ success: false, error: "Server Configuration Error: API Key missing." });
    
    const { model, contents, config } = req.body;
    
    console.log(`[AI Request] Model: ${model}, Timestamp: ${new Date().toISOString()}`);

    const response = await ai.models.generateContent({
        model: model || 'gemini-1.5-flash',
        contents: contents,
        config: config || {}
    });
    
    if (!response || !response.text) throw new Error("Empty response from Gemini");
    res.json({ success: true, data: response.text });
  } catch (error) {
    console.error("AI Proxy Error:", error.message);
    
    const msg = error.message?.toLowerCase() || "";
    const isQuotaError = error.status === 429 || 
                         msg.includes('429') || 
                         msg.includes('quota') || 
                         msg.includes('resource exhausted');

    if (isQuotaError) {
        return res.status(429).json({ success: false, error: "Quota exceeded (429). Please wait." });
    }
    
    if (error.status === 503 || msg.includes('503')) {
         return res.status(503).json({ success: false, error: "Model Overloaded (503). Retrying..." });
    }
    
    res.status(500).json({ success: false, error: error.message || "AI Generation Error" });
  }
});

// Groq Proxy
router.post('/ai/groq', async (req, res) => {
  try {
    const { model, messages, jsonMode, apiKey } = req.body;
    
    console.log(`[Groq Request] Model: ${model}, Timestamp: ${new Date().toISOString()}`);

    const keyToUse = apiKey || process.env.GROQ_API_KEY;
    
    if (!keyToUse) return res.status(503).json({ success: false, error: "Groq Config Error: No API Key found." });

    const body = { model: model || "llama-3.3-70b-versatile", messages: messages, temperature: 0.3 };
    if (jsonMode) body.response_format = { type: "json_object" };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${keyToUse}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errText = await response.text();
        if(response.status === 429) return res.status(429).json({ success: false, error: "Groq Quota Exceeded" });
        throw new Error(`Upstream ${response.status}: ${errText}`);
    }
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/health', (req, res) => res.json({ status: 'online', timestamp: Date.now() }));

app.use('/api', router);
app.use('/', router);

export default app;
