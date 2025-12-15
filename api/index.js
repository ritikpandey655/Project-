
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

// API Key setup
const apiKey = process.env.API_KEY || "AIzaSyCOGUM81Ex7pU_-QSFPgx3bdo_eQDAAfj0";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedDomains = ['https://pyqverse.in', 'https://www.pyqverse.in', 'https://pyqverse.vercel.app'];
    if (allowedDomains.includes(origin) || origin.endsWith('.vercel.app') || origin.includes('localhost')) return callback(null, true);
    return callback(null, true);
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const router = express.Router();

router.post('/ai/generate', async (req, res) => {
  try {
    if (!ai) return res.status(500).json({ success: false, error: "Server Configuration Error: API Key missing." });
    
    const { model, contents, config } = req.body;
    
    // Force stable model
    const modelToUse = 'gemini-1.5-flash';

    const response = await ai.models.generateContent({
        model: modelToUse,
        contents: contents,
        config: config || {}
    });
    
    res.json({ success: true, data: response.text });
  } catch (error) {
    console.error("AI Proxy Error:", error.message);
    res.status(500).json({ success: false, error: error.message || "AI Generation Error" });
  }
});

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
        if(response.status === 429) return res.status(429).json({ success: false, error: "Groq Quota Exceeded" });
        throw new Error(`Upstream Error`);
    }
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/health', (req, res) => res.json({ status: 'online', timestamp: Date.now() }));

app.use('/api', router);
app.use('/', router);

// Explicitly export the handler for Vercel
export default async function handler(req, res) {
  await app(req, res);
}
