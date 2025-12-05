
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";

const app = express();

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

// Security Middleware
app.use(helmet());

const allowedOrigins = [
  'https://pyqverse.in',
  'https://www.pyqverse.in',
  'https://pyqverse.vercel.app',
  'http://localhost:5173', 
  'http://localhost:4173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS Not Allowed'), false);
    }
    return callback(null, true);
  }
}));

app.use(express.json({ limit: '10mb' }));

// Rate Limiting (Simple In-Memory for Serverless warm instances)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; 
const MAX_REQUESTS = 50; 

const rateLimiter = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, startTime: now });
  } else {
    const data = requestCounts.get(ip);
    if (now - data.startTime > RATE_LIMIT_WINDOW) {
      data.count = 1; data.startTime = now;
    } else {
      data.count++;
      if (data.count > MAX_REQUESTS) return res.status(429).json({ success: false, error: "Too many requests." });
    }
  }
  next();
};

app.use('/api/ai', rateLimiter);

// Whitelist
const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-pro'];

app.post('/api/ai/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    
    if (model && !ALLOWED_MODELS.includes(model)) {
       return res.status(400).json({ success: false, error: "Unauthorized model." });
    }

    const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents: contents,
        config: config || {}
    });
    
    res.json({ success: true, data: response.text });
  } catch (error) {
    console.error("Proxy Error:", error.message);
    res.status(500).json({ success: false, error: "Generation Failed" });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'online', secure: true, timestamp: Date.now() });
});

export default app;
