
import express from 'express';
import cors from 'cors';
import helmet from 'helmet'; // Security Headers
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

// --- SECURITY MIDDLEWARE ---
app.use(helmet());

// Dynamic CORS
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedDomains = [
      'https://pyqverse.in',
      'https://www.pyqverse.in',
      'https://pyqverse.vercel.app'
    ];

    if (allowedDomains.includes(origin)) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return callback(null, true);

    return callback(new Error('CORS Not Allowed'), false);
  },
  credentials: true 
};

app.use(cors(corsOptions));
// INCREASED LIMIT TO 50MB for Images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 1. HPP Protection
app.use((req, res, next) => {
  if (req.query) {
    for (const key in req.query) {
      if (Array.isArray(req.query[key])) req.query[key] = req.query[key][0];
    }
  }
  next();
});

// 2. Basic XSS Sanitizer
const sanitizeInput = (input) => {
  if (typeof input === 'string') return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (typeof input === 'object' && input !== null) {
    for (const key in input) input[key] = sanitizeInput(input[key]);
  }
  return input;
};
app.use((req, res, next) => {
  if (req.body) req.body = sanitizeInput(req.body);
  next();
});

// --- RATE LIMITING ---
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
      if (data.count > MAX_REQUESTS) {
        return res.status(429).json({ success: false, error: "Too many requests. Please wait a moment." });
      }
    }
  }
  next();
};

// --- ROUTING ---
const router = express.Router();

router.use('/ai', rateLimiter);

// Whitelist
const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-pro'];

router.post('/ai/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    
    if (model && !ALLOWED_MODELS.includes(model)) {
       return res.status(400).json({ success: false, error: "Invalid or unauthorized model selected." });
    }

    const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents: contents,
        config: config || {}
    });
    
    res.json({ success: true, data: response.text });
  } catch (error) {
    console.error("AI Proxy Error:", error.message);
    res.status(500).json({ success: false, error: "AI Generation Failed. Please try again." });
  }
});

router.get('/health', (req, res) => {
  res.json({ status: 'online', secure: true, timestamp: Date.now(), env: 'local' });
});

// Mount paths
app.use('/api', router);

// Start Server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Secure Backend running on http://127.0.0.1:${PORT}`);
  });
}

export default app;
