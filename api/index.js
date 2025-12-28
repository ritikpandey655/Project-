import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');

app.use(helmet());
app.use(cors({ origin: true, credentials: true })); 
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const router = express.Router();

// Helper to get key
const getApiKey = (req) => {
  return process.env.API_KEY || req.headers['x-api-key'] || req.query.key;
};

// --- GEMINI ROUTE ---
router.post('/ai/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    const apiKey = getApiKey(req);
    
    if (!apiKey) return res.status(500).json({ success: false, error: "Server API Key missing" });

    // Force Gemini 2.5 Flash if not specified, or use the requested model
    // Mapping alias to specific version if needed
    let modelToUse = model || 'gemini-2.5-flash-preview'; 
    if (model === 'gemini-flash-latest') modelToUse = 'gemini-2.5-flash-preview';

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
        model: modelToUse,
        contents: contents,
        config: config || {}
    });
    
    res.json({ success: true, data: response.text });
  } catch (error) {
    console.error("Gemini Error:", error);
    if (error.status === 429 || (error.message && error.message.includes('429'))) {
        return res.status(429).json({ success: false, error: "Quota exceeded (429)" });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- GROQ ROUTE ---
router.post('/ai/groq', async (req, res) => {
  try {
    const { model, messages, jsonMode } = req.body;
    // Use Server Env for Groq, or fallback to header if passed (future proofing)
    const keyToUse = process.env.GROQ_API_KEY || req.headers['x-groq-key'];
    
    if (!keyToUse) return res.status(503).json({ success: false, error: "Groq API Key missing on Server." });

    const body = { 
        model: model || "llama-3.3-70b-versatile", 
        messages: messages, 
        temperature: 0.7 
    };
    if (jsonMode) body.response_format = { type: "json_object" };

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
        throw new Error(`Groq Error ${response.status}: ${errText}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    res.json({ success: true, data: content });
  } catch (error) {
    console.error("Groq Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/health', (req, res) => {
    const geminiKey = !!(process.env.API_KEY || req.headers['x-api-key']);
    const groqKey = !!process.env.GROQ_API_KEY;
    
    res.json({ 
        status: 'online', 
        timestamp: Date.now(),
        providers: {
            gemini: geminiKey,
            groq: groqKey
        }
    });
});

app.use('/api', router);

// Export for Vercel
export default app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => console.log(`Backend running on port ${PORT}`));
}