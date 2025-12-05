
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import helmet from 'helmet'; // Security Headers
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

// --- SECURITY MIDDLEWARE ---

// 1. Helmet: Adds security headers (HSTS, X-Frame-Options, etc.)
app.use(helmet());

// 2. Strict CORS: Only allow your Frontend Domains
const allowedOrigins = [
  'https://pyqverse.in',
  'https://www.pyqverse.in',
  'https://pyqverse.vercel.app',
  'http://localhost:5173', // Vite Dev
  'http://localhost:4173'  // Vite Preview
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST'],
  credentials: true // Allow cookies/auth headers if needed
}));

app.use(express.json({ limit: '10mb' })); // Limit body size to prevent DoS
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- RATE LIMITING ---
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 Minute
const MAX_REQUESTS = 50; 

const rateLimiter = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, startTime: now });
  } else {
    const data = requestCounts.get(ip);
    if (now - data.startTime > RATE_LIMIT_WINDOW) {
      data.count = 1;
      data.startTime = now;
    } else {
      data.count++;
      if (data.count > MAX_REQUESTS) {
        return res.status(429).json({ success: false, error: "Too many requests. Please wait a moment." });
      }
    }
  }
  next();
};

app.use('/api/ai', rateLimiter);

// --- VALIDATION HELPER ---
// Whitelist allowed models to prevent abuse of expensive models
const ALLOWED_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-pro' // Add others only if necessary
];

// --- GENERIC PROXY ENDPOINT ---
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    
    // Security Check: Validate Model
    if (model && !ALLOWED_MODELS.includes(model)) {
       return res.status(400).json({ success: false, error: "Invalid or unauthorized model selected." });
    }

    // Construct request
    const requestOptions = {
        model: model || 'gemini-2.5-flash',
        contents: contents,
        config: config || {}
    };

    const response = await ai.models.generateContent(requestOptions);
    const text = response.text;
    
    res.json({ success: true, data: text });
  } catch (error) {
    console.error("AI Proxy Error:", error.message);
    // Do not send full error stack to client in production
    res.status(500).json({ success: false, error: "AI Generation Failed. Please try again." });
  }
});

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', secure: true, timestamp: Date.now() });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Secure Backend running on http://127.0.0.1:${PORT}`);
  });
}

export default app;
