
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');

const apiKey = process.env.API_KEY;
if (!apiKey) console.error("CRITICAL: API_KEY is missing.");
const ai = new GoogleGenAI({ apiKey: apiKey || "DUMMY_KEY" });

app.use(helmet());
app.use(cors({ origin: true, credentials: true })); // Allow all for local dev
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const router = express.Router();

router.post('/ai/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
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

router.get('/health', (req, res) => res.json({ status: 'online' }));

app.use('/api', router);

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => console.log(`Backend running on port ${PORT}`));
}

export default app;
