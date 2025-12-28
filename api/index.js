import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";

const app = express();

app.use(helmet({
  contentSecurityPolicy: false, 
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Helper to get key from Env OR Header
const getApiKey = (req) => {
  return process.env.API_KEY || req.headers['x-api-key'] || req.query.key;
};

// 1. Health & Security Check
app.get('/api/health', (req, res) => {
  const apiKey = getApiKey(req);
  res.json({ 
    status: 'Online', 
    secure: !!apiKey,
    provider: 'Google Gemini',
    node: 'Production',
    mode: apiKey === process.env.API_KEY ? 'Server-Side' : 'Hybrid-Bridge',
    timestamp: Date.now()
  });
});

// 2. Main AI Generation Endpoint
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    const apiKey = getApiKey(req);
    
    if (!apiKey) {
      console.error("FATAL: API_KEY missing in both Env and Headers.");
      return res.status(500).json({ success: false, error: "Security Error: API_KEY Missing" });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Default to flash-preview if not specified
    const modelToUse = model || 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: contents,
      config: {
        ...config,
        temperature: config?.temperature ?? 0.7
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("AI returned an empty response.");
    }

    res.json({ success: true, data: text });
  } catch (error) {
    console.error("AI GENERATION ERROR:", error);
    res.status(error.status || 500).json({ 
      success: false, 
      error: error.message || "AI Generation Failed" 
    });
  }
});

export default app;