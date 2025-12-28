import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Health Check Endpoint (MUST match AdminDashboard fetch call)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Online', 
    secure: !!process.env.API_KEY,
    timestamp: Date.now()
  });
});

// Main Generation Endpoint
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    if (!process.env.API_KEY) {
      return res.status(500).json({ success: false, error: "API_KEY Missing on Server" });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents: contents,
      config: config || {}
    });

    res.json({ success: true, data: response.text });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default app;