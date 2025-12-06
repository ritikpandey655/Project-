
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";

const app = express();

// SECURITY: Trust Proxy for Vercel/Cloudflare (Critical for Rate Limiting)
app.set('trust proxy', 1);

// SECURITY: Hide Express Fingerprint
app.disable('x-powered-by');

// SECURITY: Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

// --- SECURITY MIDDLEWARE LAYERS ---

// 1. Helmet (Secure Headers)
app.use(helmet({
  contentSecurityPolicy: false, // API doesn't serve HTML
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. Dynamic CORS (Strict Origin)
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow mobile apps/curl
    
    const allowedDomains = [
      'https://pyqverse.in',
      'https://www.pyqverse.in',
      'https://pyqverse.vercel.app'
    ];

    if (allowedDomains.includes(origin)) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return callback(null, true);

    console.warn(`Blocked CORS Request from: ${origin}`);
    return callback(new Error('Security Block: Origin Not Allowed'), false);
  },
  methods: ['GET', 'POST', 'OPTIONS'], // Only allow necessary methods
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

// 3. Payload Limit (Increased for Image Uploads)
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 4. Manual HPP (HTTP Parameter Pollution) Protection
app.use((req, res, next) => {
  if (req.query) {
    for (const key in req.query) {
      if (Array.isArray(req.query[key])) {
        req.query[key] = req.query[key][0]; // Take only the first value
      }
    }
  }
  next();
});

// 5. Basic XSS Sanitizer (Sanitize Body)
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  if (typeof input === 'object' && input !== null) {
    for (const key in input) {
      input[key] = sanitizeInput(input[key]);
    }
  }
  return input;
};

app.use((req, res, next) => {
  if (req.body) req.body = sanitizeInput(req.body);
  next();
});

// 6. Strict Rate Limiting (Memory Store)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 Minute
const MAX_REQUESTS = 40; // Max 40 requests per minute per IP

const rateLimiter = (req, res, next) => {
  // Get real IP through proxy
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  
  const now = Date.now();
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, startTime: now });
  } else {
    const data = requestCounts.get(ip);
    if (now - data.startTime > RATE_LIMIT_WINDOW) {
      data.count = 1; data.startTime = now;
    } else {
      data.count++;
      if (data.count > MAX_REQUESTS) {
        console.warn(`Rate Limit Exceeded for IP: ${ip}`);
        return res.status(429).json({ success: false, error: "Too many requests. Slow down." });
      }
    }
  }
  next();
};

// --- ROUTER SETUP ---
const router = express.Router();

router.use('/ai', rateLimiter);

// Whitelist Models
const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-pro', 'gemini-1.5-pro'];

router.post('/ai/generate', async (req, res) => {
  try {
    // Enforce Content-Type
    if (!req.is('application/json')) {
       return res.status(400).json({ success: false, error: "Invalid Content-Type" });
    }

    const { model, contents, config } = req.body;
    
    // 1. Model Validation
    if (model && !ALLOWED_MODELS.includes(model)) {
       return res.status(400).json({ success: false, error: "Unauthorized AI Model." });
    }

    // 2. Gemini Generation
    const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents: contents,
        config: config || {}
    });
    
    // 3. Response Structure Check
    if (!response || !response.text) {
        throw new Error("Empty response from AI Provider");
    }

    res.json({ success: true, data: response.text });
  } catch (error) {
    console.error("AI Proxy Error:", error.message);
    res.status(500).json({ success: false, error: "AI Service Interrupted. Please try again." });
  }
});

// Secure Groq Proxy
router.post('/ai/groq', async (req, res) => {
  try {
    if (!req.is('application/json')) {
        return res.status(400).json({ success: false, error: "Invalid Content-Type" });
    }

    const { model, messages, jsonMode } = req.body;
    
    // SECURITY: Use Server Key Only
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(503).json({ success: false, error: "AI Service Unavailable (Config Error)." });
    }

    // Validate Input Structure
    if (!Array.isArray(messages)) {
        return res.status(400).json({ success: false, error: "Invalid message format." });
    }

    const body = {
        model: model || "llama3-70b-8192",
        messages: messages,
        temperature: 0.3
    };
    if (jsonMode) {
        body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Upstream Error: ${response.status}`);
    }

    const data = await response.json();
    res.json({ success: true, data });

  } catch (error) {
    console.error("Groq Proxy Error:", error.message);
    res.status(500).json({ success: false, error: "Fast AI Generation Failed." });
  }
});

router.get('/health', (req, res) => {
  res.json({ 
      status: 'online', 
      security: 'high', 
      timestamp: Date.now(), 
      env: process.env.VERCEL ? 'vercel-serverless' : 'self-hosted' 
  });
});

// Mount router
app.use('/api', router);
app.use('/', router);

export default app;
