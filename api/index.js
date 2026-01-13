
import { config } from 'dotenv';
import { resolve } from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

// Load local .env if it exists
const rootEnvPath = resolve(process.cwd(), '.env');
if (fs.existsSync(rootEnvPath)) {
    config({ path: rootEnvPath });
}

// --- CRITICAL FIX FOR GOOGLE API KEY REFERRER RESTRICTION ---
const originalFetch = global.fetch;
global.fetch = async (url, options = {}) => {
    const urlStr = url.toString();
    if (urlStr.includes('generativelanguage.googleapis.com')) {
        const newOptions = { ...options };
        let headers = {};
        if (newOptions.headers) {
            if (newOptions.headers instanceof Headers) {
                newOptions.headers.forEach((val, key) => { headers[key] = val; });
            } else if (Array.isArray(newOptions.headers)) {
                newOptions.headers.forEach(([key, val]) => { headers[key] = val; });
            } else {
                headers = { ...newOptions.headers };
            }
        }
        headers['Referer'] = 'https://pyqverse.in/';
        headers['User-Agent'] = 'PYQverse-Server/1.0';
        newOptions.headers = headers;
        return originalFetch(url, newOptions);
    }
    return originalFetch(url, options);
};
// -----------------------------------------------------------

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ 
    origin: true, 
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'] 
}));

// INCREASED LIMIT FOR IMAGE/PDF UPLOADS
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const getGeminiKey = () => {
    return process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_API_KEY;
};

const getGroqKey = () => process.env.GROQ_API_KEY;

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
    const geminiKey = getGeminiKey();
    res.json({ 
        status: 'online', 
        environment: process.env.VERCEL ? 'Vercel Serverless' : 'Local Node',
        env: {
            gemini: geminiKey ? 'Active' : 'Missing',
            groq: getGroqKey() ? 'Active' : 'Missing'
        }
    });
});

// --- GEMINI ROUTE ---
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    const apiKey = getGeminiKey();
    
    if (!apiKey) {
        return res.status(500).json({ 
            success: false, 
            error: "SERVER_ERROR: API Key is missing in Vercel Environment Variables." 
        });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Switch to gemini-3-flash-preview which supports text and images
    const response = await ai.models.generateContent({
        model: model || 'gemini-3-flash-preview',
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
    console.error("Gemini Error:", error);
    if (error.status === 403 || (error.message && error.message.includes('blocked'))) {
        return res.status(403).json({ 
            success: false, 
            error: `Google API Error: Access Blocked. Ensure 'https://pyqverse.in/' is in the allowed referrers list.`
        });
    }
    res.status(500).json({ success: false, error: error.message || "AI Generation Failed" });
  }
});

// --- GROQ ROUTE ---
app.post('/api/ai/groq', async (req, res) => {
  try {
    const { model, messages, jsonMode } = req.body;
    const apiKey = getGroqKey();
    
    if (!apiKey) {
        return res.status(503).json({ success: false, error: "Groq Key missing on server." });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
             model: model || "llama-3.3-70b-versatile",
             messages,
             temperature: 0.7,
             response_format: jsonMode ? { type: "json_object" } : undefined
        })
    });

    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    res.json({ success: true, data: data.choices?.[0]?.message?.content || "" });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
      console.log(`\n🚀 Local Server running on http://localhost:${PORT}`);
  });
}

export default app;
