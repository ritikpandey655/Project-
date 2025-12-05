
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";

const app = express();

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

// Security Middleware
app.use(helmet());

// Dynamic CORS to allow Vercel Previews & Localhost
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allowed static domains
    const allowedDomains = [
      'https://pyqverse.in',
      'https://www.pyqverse.in',
      'https://pyqverse.vercel.app'
    ];

    if (allowedDomains.includes(origin)) return callback(null, true);
    
    // Allow any Vercel Preview URL (e.g., pyqverse-git-main-user.vercel.app)
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    
    // Allow Localhost
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return callback(null, true);

    console.warn(`Blocked CORS for origin: ${origin}`);
    return callback(new Error('CORS Not Allowed'), false);
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' })); // Reduced limit for security

// Rate Limiting
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

// --- ROUTER SETUP ---
const router = express.Router();

router.use('/ai', rateLimiter);

// Whitelist
const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-pro'];

router.post('/ai/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    
    // 1. Model Validation
    if (model && !ALLOWED_MODELS.includes(model)) {
       return res.status(400).json({ success: false, error: "Unauthorized model." });
    }

    // 2. Input Validation (Prevent huge payloads)
    const inputString = JSON.stringify(contents);
    if (inputString.length > 50000) { // Limit to ~50KB text
        return res.status(400).json({ success: false, error: "Input too long." });
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

router.get('/health', (req, res) => {
  res.json({ status: 'online', secure: true, timestamp: Date.now(), env: 'serverless' });
});

// Mount router at both /api (standard) and / (fallback if rewritten)
app.use('/api', router);
app.use('/', router);

export default app;
