
import { config } from 'dotenv';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

// --- ROBUST ENV LOADING ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Search for .env in the root directory (where package.json usually lives)
const rootEnvPath = resolve(process.cwd(), '.env');

if (fs.existsSync(rootEnvPath)) {
    config({ path: rootEnvPath });
    console.log(`[Server] ✅ Loaded .env file from: ${rootEnvPath}`);
} else {
    // Fallback: try loading default .env (works in some setups)
    config(); 
    console.warn("[Server] ⚠️  WARNING: No .env file found at root. Checking system variables...");
}

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');

// Allow CORS
app.use(cors({ origin: true, credentials: true })); 
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper to get keys with debug logging
const getGeminiKey = () => {
    const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
    return key ? key.replace(/['"]/g, '').trim() : null;
};

const getGroqKey = () => {
    const key = process.env.GROQ_API_KEY;
    return key ? key.replace(/['"]/g, '').trim() : null;
};

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
    const geminiKey = getGeminiKey();
    const groqKey = getGroqKey();
    
    const statusData = { 
        status: 'online', 
        timestamp: Date.now(),
        env: {
            gemini: geminiKey ? 'Active' : 'Missing',
            groq: groqKey ? 'Active' : 'Missing'
        }
    };

    console.log(`[Health Check] Status: ${JSON.stringify(statusData.env)}`);
    res.json(statusData);
});

// --- GEMINI ROUTE ---
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    const apiKey = getGeminiKey();
    
    if (!apiKey) {
        console.error("❌ [Backend] Gemini API Key is MISSING in .env file");
        return res.status(500).json({ 
            success: false, 
            error: "SERVER_KEY_MISSING: Create a .env file in root with API_KEY=..." 
        });
    }

    const modelToUse = model || 'gemini-2.5-flash-preview'; 
    
    // Initialize Google GenAI
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
        model: modelToUse,
        contents: contents,
        config: config || {}
    });
    
    let text = "";
    if (response.text) {
        text = response.text;
    } else if (response.candidates && response.candidates.length > 0) {
        text = response.candidates[0].content.parts.map(p => p.text).join('');
    }

    res.json({ success: true, data: text });

  } catch (error) {
    console.error("Gemini Backend Error:", error);
    res.status(500).json({ success: false, error: error.message || "AI Generation Failed" });
  }
});

// --- GROQ ROUTE ---
app.post('/api/ai/groq', async (req, res) => {
  try {
    const { model, messages, jsonMode } = req.body;
    const apiKey = getGroqKey();
    
    if (!apiKey) {
        return res.status(503).json({ success: false, error: "SERVER_KEY_MISSING: GROQ_API_KEY missing in .env" });
    }

    const body = { 
        model: model || "llama-3.3-70b-versatile", 
        messages: messages, 
        temperature: 0.7 
    };
    if (jsonMode) body.response_format = { type: "json_object" };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
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

// --- LOCAL STARTUP ---
if (process.env.NODE_ENV !== 'production' || process.env.VITE_VERCEL_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Backend Server Running on http://localhost:${PORT}`);
      console.log(`   -------------------------------------------------`);
      
      const k = getGeminiKey();
      if (k) console.log(`   ✅ Gemini Key Found: ...${k.slice(-4)}`);
      else console.log(`   ❌ Gemini Key MISSING (Check .env file)`);

      const g = getGroqKey();
      if (g) console.log(`   ✅ Groq Key Found:   ...${g.slice(-4)}`);
      else console.log(`   ❌ Groq Key MISSING`);
      
      console.log(`   -------------------------------------------------\n`);
  });
}

export default app;
