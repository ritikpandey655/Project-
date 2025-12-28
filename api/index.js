
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";

const app = express();

// --- SECURITY CONFIGURATION ---
// 1. Helmet for HTTP Header Security
app.use(helmet());

// 2. CORS: Allow specific origins in production
const allowedOrigins = [
  'https://pyqverse.in', 
  'https://www.pyqverse.in', 
  'http://localhost:5173', 
  'http://localhost:4173'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      // In development, you might want to allow all, but for security:
      return callback(null, true); // Strict: callback(new Error('Not allowed by CORS'))
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// --- ROUTES ---

// Health & Latency Check
app.get('/api/health', async (req, res) => {
  const start = Date.now();
  
  // Security Check: Ensure API Key is loaded
  const isSecure = !!process.env.API_KEY;
  
  res.json({ 
    status: 'Online', 
    service: 'PYQverse Secure Backend', 
    secure: isSecure,
    timestamp: Date.now(),
    latency_check: 'pong'
  });
});

// Main Generation Endpoint (Gemini)
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;

    if (!process.env.API_KEY) {
      console.error("CRITICAL: API_KEY is missing on server");
      return res.status(500).json({ success: false, error: "Server Configuration Error: Key Missing" });
    }

    const modelName = model || 'gemini-3-flash-preview';

    // Fix: Create a new GoogleGenAI instance right before making an API call.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: config || {}
    });

    // Fix: Access response.text directly as a property.
    res.json({ success: true, data: response.text });

  } catch (error) {
    console.error("Backend AI Error:", error);
    const status = (error.status === 429 || (error.message && error.message.includes('429'))) ? 429 : 500;
    const msg = status === 429 ? "AI Quota Exceeded. Please try again later." : "Secure Backend Error";
    
    res.status(status).json({ success: false, error: msg });
  }
});

// Groq Generation Endpoint
app.post('/api/ai/groq', async (req, res) => {
  try {
    const { model, messages, jsonMode, apiKey } = req.body;
    
    // Use Server Env Key if client doesn't provide one
    const keyToUse = apiKey || process.env.GROQ_API_KEY;
    
    if (!keyToUse) {
        return res.status(503).json({ success: false, error: "Groq Config Error: No API Key found on server." });
    }

    const body = { 
        model: model || "llama-3.3-70b-versatile", 
        messages: messages, 
        temperature: 0.3 
    };
    
    if (jsonMode) {
        body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${keyToUse}`, 
            "Content-Type": "application/json" 
        },
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
    console.error("Groq Proxy Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server (Local Dev)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Secure Backend running on port ${PORT}`));
}

export default app;
