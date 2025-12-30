
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";

// --- ROBUST ENV LOADING ---
// This ensures .env is found whether running via 'node api/index.js' or 'vercel dev'
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try loading from root (../.env) and current (./.env)
config({ path: join(__dirname, '../.env') });
config({ path: join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');

// Allow CORS for all domains
app.use(cors({ origin: true, credentials: true })); 
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper to get API Key safely
const getGeminiKey = () => {
    return process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_API_KEY;
};

const getGroqKey = () => {
    return process.env.GROQ_API_KEY;
};

// --- HEALTH CHECK & LATENCY TEST ---
app.get('/api/health', (req, res) => {
    const geminiKey = getGeminiKey();
    const groqKey = getGroqKey();
    
    console.log(`[Health Check] Gemini Key Present: ${!!geminiKey}, Groq Key Present: ${!!groqKey}`);

    res.json({ 
        status: 'online', 
        timestamp: Date.now(),
        env: {
            gemini: geminiKey ? 'Active' : 'Missing',
            groq: groqKey ? 'Active' : 'Missing'
        }
    });
});

// --- GEMINI ROUTE ---
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    
    // 1. Get Key from Environment or Header
    const apiKey = getGeminiKey() || req.headers['x-api-key'];
    
    if (!apiKey) {
        console.error("[API Error] No API Key found in Environment Variables.");
        return res.status(500).json({ 
            success: false, 
            error: "Server Error: API Key not configured on server. Check Vercel Environment Variables." 
        });
    }

    // 2. Initialize Gemini
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
    console.error("Gemini Backend Error:", error.message);
    
    let status = 500;
    let message = error.message;

    if (error.status === 429) {
        status = 429;
        message = "Server Busy (429). Please try again in a few seconds.";
    }

    res.status(status).json({ success: false, error: message });
  }
});

// --- GROQ ROUTE ---
app.post('/api/ai/groq', async (req, res) => {
  try {
    const { model, messages, jsonMode } = req.body;
    
    const apiKey = getGroqKey() || req.headers['x-groq-key'];
    
    if (!apiKey) {
        return res.status(503).json({ 
            success: false, 
            error: "Groq Key missing on server." 
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
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Backend running on http://localhost:${PORT}`);
      console.log(`   - Gemini Key: ${getGeminiKey() ? 'Loaded ✅' : 'Missing ❌'}`);
      console.log(`   - Groq Key:   ${getGroqKey() ? 'Loaded ✅' : 'Missing ❌'}\n`);
  });
}

export default app;
