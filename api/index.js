import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";

const app = express();

app.use(helmet({
  contentSecurityPolicy: false, // Required for some external resource loads in PWA
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// 1. Health & Security Check (Admin Panel Source)
app.get('/api/health', (req, res) => {
  const hasKey = !!process.env.API_KEY;
  res.json({ 
    status: 'Online', 
    secure: hasKey,
    provider: 'Google Gemini',
    node: 'Production',
    timestamp: Date.now()
  });
});

// 2. Main AI Generation Endpoint
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      console.error("FATAL: API_KEY is missing from environment variables.");
      return res.status(500).json({ success: false, error: "Backend Security Error: API_KEY Missing" });
    }

    const ai = new GoogleGenAI({ apiKey });
    // Use gemini-3-flash-preview as the default high-performance model
    const response = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
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
      error: error.message || "An unexpected error occurred during AI generation." 
    });
  }
});

export default app;