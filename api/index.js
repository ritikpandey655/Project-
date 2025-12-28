
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');

// Allow CORS for all domains to prevent connectivity issues
app.use(cors({ origin: true, credentials: true })); 
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- HEALTH CHECK & LATENCY TEST ---
app.get('/api/health', (req, res) => {
    // Check if keys are loaded in the environment
    const geminiStatus = !!process.env.API_KEY;
    const groqStatus = !!process.env.GROQ_API_KEY;
    
    res.json({ 
        status: 'online', 
        timestamp: Date.now(),
        env: {
            gemini: geminiStatus ? 'Active' : 'Missing',
            groq: groqStatus ? 'Active' : 'Missing'
        }
    });
});

// --- GEMINI ROUTE ---
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    
    // 1. Get Key from Environment (Vercel) or Header (Client Override)
    const apiKey = process.env.API_KEY || req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(500).json({ 
            success: false, 
            error: "Configuration Error: API_KEY not found in server environment." 
        });
    }

    // 2. Initialize Gemini 2.5 Flash (Default)
    // If user requests a specific model, we respect it, otherwise default.
    const modelToUse = model || 'gemini-2.5-flash-preview'; 

    const ai = new GoogleGenAI({ apiKey });

    // 3. Generate
    const response = await ai.models.generateContent({
        model: modelToUse,
        contents: contents,
        config: config || {}
    });
    
    res.json({ success: true, data: response.text });

  } catch (error) {
    console.error("Gemini Backend Error:", error);
    
    let status = 500;
    let message = error.message;

    if (error.status === 429) {
        status = 429;
        message = "Gemini Rate Limit Exceeded (429). Try again later.";
    }

    res.status(status).json({ success: false, error: message });
  }
});

// --- GROQ ROUTE ---
app.post('/api/ai/groq', async (req, res) => {
  try {
    const { model, messages, jsonMode } = req.body;
    
    // 1. Get Key from Environment
    const apiKey = process.env.GROQ_API_KEY || req.headers['x-groq-key'];
    
    if (!apiKey) {
        return res.status(503).json({ 
            success: false, 
            error: "Configuration Error: GROQ_API_KEY not found in server environment." 
        });
    }

    const body = { 
        model: model || "llama-3.3-70b-versatile", 
        messages: messages, 
        temperature: 0.7 
    };
    if (jsonMode) body.response_format = { type: "json_object" };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${apiKey}`, 
            "Content-Type": "application/json" 
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    res.json({ success: true, data: content });

  } catch (error) {
    console.error("Groq Backend Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- LOCAL SERVER STARTUP ---
// This allows running `node api/index.js` locally
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Backend running on http://localhost:${PORT}`);
      console.log(`   - Gemini Key: ${process.env.API_KEY ? 'Loaded ✅' : 'Missing ❌'}`);
      console.log(`   - Groq Key:   ${process.env.GROQ_API_KEY ? 'Loaded ✅' : 'Missing ❌'}\n`);
  });
}

// Export for Vercel Serverless
export default app;
