
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("CRITICAL ERROR: API_KEY is missing.");
}
const ai = new GoogleGenAI({ apiKey: apiKey || "DUMMY_KEY" });

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

// Rate Limit
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
      if (data.count > 60) return res.status(429).json({ success: false, error: "Too many requests." });
    }
  }
  next();
};

const router = express.Router();
router.use('/ai', rateLimiter);

router.post('/ai/generate', async (req, res) => {
  try {
    if (!process.env.API_KEY) return res.status(500).json({ success: false, error: "API Key missing." });
    const { model, contents, config } = req.body;
    
    const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents: contents,
        config: config || {}
    });
    
    if (!response || !response.text) throw new Error("Empty response");
    res.json({ success: true, data: response.text });
  } catch (error) {
    console.error("AI Proxy Error:", error);
    
    // Forward 429 specifically
    if (error.status === 429 || (error.message && error.message.includes('429'))) {
        return res.status(429).json({ success: false, error: "Quota exceeded (429)" });
    }
    
    res.status(500).json({ success: false, error: error.message || "AI Error" });
  }
});

// Groq Proxy
router.post('/ai/groq', async (req, res) => {
  try {
    const { model, messages, jsonMode } = req.body;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(503).json({ success: false, error: "Groq Config Error" });

    const body = { model: model || "llama3-70b-8192", messages: messages, temperature: 0.3 };
    if (jsonMode) body.response_format = { type: "json_object" };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        if(response.status === 429) return res.status(429).json({ success: false, error: "Groq Quota Exceeded" });
        throw new Error(`Upstream ${response.status}`);
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
