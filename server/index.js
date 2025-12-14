
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');

// Updated Key provided by user
const apiKey = process.env.API_KEY || "AIzaSyCOGUM81Ex7pU_-QSFPgx3bdo_eQDAAfj0";

if (!apiKey) console.warn("WARNING: API_KEY is missing.");
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

app.use(helmet());
app.use(cors({ origin: true, credentials: true })); // Allow all for local dev
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const router = express.Router();

// --- GEMINI ROUTE ---
router.post('/ai/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    
    if (!ai) return res.status(500).json({ success: false, error: "Server API Key missing" });

    // Force fallback to 1.5 Flash as it is the most stable for this key tier
    // We ignore the requested 'gemini-2.5' if it fails often, but let's try to honor it or fallback
    const modelName = 'gemini-1.5-flash'; 

    const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: config || {}
    });
    res.json({ success: true, data: response.text });
  } catch (error) {
    console.error("AI Proxy Error:", error);
    if (error.status === 429 || (error.message && error.message.includes('429'))) {
        return res.status(429).json({ success: false, error: "Quota exceeded (429)" });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- GROQ ROUTE ---
router.post('/ai/groq', async (req, res) => {
  try {
    const { model, messages, jsonMode, apiKey } = req.body;
    const keyToUse = apiKey || process.env.GROQ_API_KEY;
    if (!keyToUse) return res.status(503).json({ success: false, error: "Groq Config Error: No API Key found." });

    const body = { model: model || "llama-3.3-70b-versatile", messages: messages, temperature: 0.3 };
    if (jsonMode) body.response_format = { type: "json_object" };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${keyToUse}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errText = await response.text();
        if(response.status === 429) return res.status(429).json({ success: false, error: "Groq Quota Exceeded" });
        throw new Error(`Upstream ${response.status}: ${errText}`);
    }
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/health', (req, res) => res.json({ status: 'online', timestamp: Date.now() }));

app.use('/api', router);

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => console.log(`Backend running on port ${PORT}`));
}

export default app;
