import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Robust Health Check for Admin Panel
app.get('/api/health', (req, res) => {
  const hasKey = !!process.env.API_KEY;
  res.json({ 
    status: 'Online', 
    secure: hasKey,
    provider: 'Google Gemini',
    timestamp: Date.now()
  });
});

// AI Generation Logic
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ success: false, error: "API_KEY Missing on Server" });
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

    res.json({ success: true, data: response.text });
  } catch (error) {
    console.error("Backend AI Error:", error);
    res.status(error.status || 500).json({ 
      success: false, 
      error: error.message || "Internal Server Error during generation" 
    });
  }
});

export default app;