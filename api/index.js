
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
app.use(helmet({
    contentSecurityPolicy: false, // Allow images/scripts from other domains
    crossOriginEmbedderPolicy: false
}));
app.use(cors({ 
    origin: true, 
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'] 
}));

// INCREASED LIMIT FOR IMAGE/PDF UPLOADS
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// SERVE STATIC FILES (Fix for missing icons in local server mode)
app.use(express.static('public'));
app.use(express.static('dist'));

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

    // Safety Check for Empty Content
    if (!contents || !Array.isArray(contents) || contents.length === 0) {
        return res.status(400).json({ success: false, error: "Invalid Request: 'contents' is missing or empty." });
    }

    // Validate Inline Data parts to prevent "Buffer <null>" error
    for (const part of contents) {
        if (part.parts && Array.isArray(part.parts)) {
            for (const p of part.parts) {
                if (p.inlineData) {
                    if (!p.inlineData.data) {
                        return res.status(400).json({ success: false, error: "Invalid Image Data: inlineData.data is null/empty." });
                    }
                    if (!p.inlineData.mimeType) {
                        return res.status(400).json({ success: false, error: "Invalid Image Data: inlineData.mimeType is missing." });
                    }
                }
            }
        }
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Switch to gemini-3-flash-preview which supports text and images, or use requested model
    const response = await ai.models.generateContent({
        model: model || 'gemini-3-flash-preview',
        contents: contents,
        config: config || {}
    });
    
    // Structured Output for Text AND Images
    let output = { text: "", images: [] };

    if (response.candidates && response.candidates.length > 0) {
        const parts = response.candidates[0].content.parts;
        for (const part of parts) {
            if (part.text) {
                output.text += part.text;
            }
            if (part.inlineData) {
                output.images.push({
                    mimeType: part.inlineData.mimeType,
                    data: part.inlineData.data
                });
            }
        }
    } else if (response.text) {
         output.text = response.text;
    }

    res.json({ success: true, data: output });

  } catch (error) {
    console.error("Gemini Error:", error);
    if (error.status === 403 || (error.message && error.message.includes('blocked'))) {
        return res.status(403).json({ 
            success: false, 
            error: `Google API Error: Access Blocked. Ensure 'https://pyqverse.in/' is in the allowed referrers list.`
        });
    }
    // Handle SDK errors more gracefully
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
    
    // Return compatible structure for Groq (Text only)
    res.json({ 
        success: true, 
        data: { 
            text: data.choices?.[0]?.message?.content || "",
            images: []
        } 
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// For SPA handling - Serve index.html for all other routes
app.get('*', (req, res) => {
    // Try to find file in public/dist first, else return index.html
    const indexPath = fs.existsSync(resolve('dist', 'index.html')) 
        ? resolve('dist', 'index.html') 
        : resolve('public', 'index.html');
        
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send("Build not found. Please run 'npm run build' or check public folder.");
    }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
      console.log(`\n🚀 Local Server running on http://localhost:${PORT}`);
  });
}

export default app;
