
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import axios from 'axios';
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Gemini Client
// IMPORTANT: Ensure API_KEY is set. If not, this might throw, so we default to empty to allow server start (requests will fail gracefully).
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- RATE LIMITING (TANK MODE SECURITY) ---
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 Minute
const MAX_REQUESTS = 30; // Increased to 30 for smoother testing

const rateLimiter = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, startTime: now });
  } else {
    const data = requestCounts.get(ip);
    if (now - data.startTime > RATE_LIMIT_WINDOW) {
      // Reset window
      data.count = 1;
      data.startTime = now;
    } else {
      data.count++;
      if (data.count > MAX_REQUESTS) {
        return res.status(429).json({ success: false, error: "Too many requests. Please wait a moment." });
      }
    }
  }
  next();
};

// Apply Rate Limiter to AI routes
app.use('/api/ai', rateLimiter);

// --- HELPER FUNCTIONS ---

const cleanJson = (text) => {
  if (!text) return "[]";
  const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  let cleaned = match ? match[0] : text;
  cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '').trim();
  return cleaned;
};

const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', timestamp: Date.now(), service: 'PYQverse Backend' });
});

// --- AI ENDPOINTS ---

const commonConfig = {
    // Disable safety filters to ensure educational content (history, wars, politics) isn't blocked
    safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ]
};

app.post('/api/ai/questions', async (req, res) => {
  try {
    const { exam, subject, count = 5, mode = 'practice', year, topic } = req.body;
    
    let prompt = "";
    if (mode === 'pyq' && year) {
        prompt = `
          Simulate ${count} high-yield questions based on the ${year} ${exam} exam pattern for ${subject}.
          ${topic ? `Focus Topic: ${topic}` : ''}
          STRICT ACCURACY RULES:
          1. If exact PYQ text is restricted, generate a 'Concept Twin'.
          2. Maintain the exact difficulty level of ${year}.
          3. Output strictly JSON array.
        `;
    } else {
        prompt = `
          You are an expert examiner for ${exam}. 
          Generate ${count} HIGH-ACCURACY multiple-choice questions for subject: ${subject}.
          ${topic ? `Focus Topics: ${topic}` : 'Topics: Standard Syllabus Coverage'}
          STRICT RULES:
          1. QUESTIONS MUST BE SOLVABLE and Factual.
          2. OPTIONS: Must be distinct and unambiguous.
          3. EXPLANATION: Provide step-by-step verification.
          Output strictly JSON array.
        `;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          ...commonConfig,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                text_hi: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                options_hi: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                explanation_hi: { type: Type.STRING },
                type: { type: Type.STRING },
                answer: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['text', 'options', 'correctIndex', 'explanation']
            }
          }
        }
    });

    const jsonStr = cleanJson(response.text);
    const rawQuestions = JSON.parse(jsonStr);
    
    const formatted = rawQuestions.map((q, idx) => ({
        id: generateId(`${mode}-q${idx}`),
        text: q.text,
        textHindi: q.text_hi,
        options: q.options || [],
        optionsHindi: q.options_hi || [],
        correctIndex: q.correctIndex ?? 0,
        explanation: q.explanation,
        explanationHindi: q.explanation_hi,
        answer: q.answer,
        type: q.type || 'MCQ',
        tags: q.tags || [],
        source: 'PYQ_AI',
        examType: exam,
        subject: subject,
        createdAt: Date.now(),
        pyqYear: year
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error("AI Question Gen Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ai/doubt', async (req, res) => {
  try {
    const { text, image, mimeType, exam, subject, topic } = req.body;
    let contents = [];
    
    if (image) {
       contents = {
         parts: [
            { inlineData: { mimeType: mimeType || 'image/jpeg', data: image } },
            { text: `Analyze this image for ${exam} (${subject}). Extract the question, solve it step-by-step, and return JSON.` }
         ]
       };
    } else {
       const promptText = text 
         ? `Solve this specific question for ${exam}: "${text}"`
         : `Generate 1 High-Quality MCQ for ${exam}. Subject: ${subject}, Topic: ${topic}.`;
       contents = { parts: [{ text: promptText + " Ensure factual accuracy. Return JSON." }] };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        ...commonConfig,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            text_hi: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            options_hi: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
            explanation_hi: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['text', 'explanation']
        }
      }
    });

    const jsonStr = cleanJson(response.text);
    res.json({ success: true, data: JSON.parse(jsonStr) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ai/news', async (req, res) => {
  try {
    const { exam, type, month, year, category, subject } = req.body;
    let prompt = "";

    if (type === 'quiz') {
        prompt = `Generate 10 High-Quality Current Affairs MCQs for ${exam}. Period: ${month || 'Recent'} ${year || ''}. Output strictly JSON array.`;
    } else if (type === 'notes') {
        prompt = `Generate 8 High-Yield Study Notes/Formulas for ${exam}. Subject: ${subject || 'Key Concepts'}. Include English & Hindi. Format: Title, Content. Output JSON array.`;
    } else {
        prompt = `Retrieve 8 REAL, VERIFIED Current Affairs events for ${exam} preparation. Period: ${month} ${year}. Category: ${category}. STRICTLY NO FAKE DATES. Output JSON array with headline, summary, date.`;
    }

    const responseSchema = type === 'quiz' ? {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                text: { type: Type.STRING },
                text_hi: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                options_hi: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                explanation_hi: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['text', 'options', 'correctIndex']
        }
    } : {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                headline: { type: Type.STRING },
                headline_hi: { type: Type.STRING },
                summary: { type: Type.STRING },
                summary_hi: { type: Type.STRING },
                category: { type: Type.STRING },
                date: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['headline', 'summary']
        }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { ...commonConfig, responseMimeType: "application/json", responseSchema: responseSchema }
    });

    res.json({ success: true, data: JSON.parse(cleanJson(response.text)) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ai/paper', async (req, res) => {
  try {
    const { exam, subject, difficulty, seedData, config } = req.body;
    const prompt = `
      Generate a Mock Exam Paper for ${exam} (${subject}).
      Difficulty: ${difficulty}.
      Context: ${seedData || 'Standard Syllabus'}.
      Structure:
      - MCQs: ${config.includeMCQ ? (config.mcqCount || 10) : 0}
      - Short Answers: ${config.includeShort ? 5 : 0}
      - Long Answers: ${config.includeLong ? 3 : 0}
      Output a complex JSON object containing 'meta' and 'sections' array.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            ...commonConfig,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    duration: { type: Type.INTEGER },
                    totalMarks: { type: Type.INTEGER },
                    sections: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                type: { type: Type.STRING },
                                marksPerQuestion: { type: Type.INTEGER },
                                questions: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            text: { type: Type.STRING },
                                            text_hi: { type: Type.STRING },
                                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                            answer: { type: Type.STRING },
                                            explanation: { type: Type.STRING }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    res.json({ success: true, data: JSON.parse(cleanJson(response.text)) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ai/extract', async (req, res) => {
    try {
        const { text, image, exam } = req.body;
        const prompt = `Extract all questions from this input for ${exam}. Return JSON Array. Remove question numbers.`;
        const contents = { parts: [] };
        if(image) contents.parts.push({ inlineData: { mimeType: 'image/jpeg', data: image } });
        if(text) contents.parts.push({ text: `${prompt}\n\n${text}` });
        else contents.parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                ...commonConfig,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                            text_hi: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            options_hi: { type: Type.ARRAY, items: { type: Type.STRING } },
                            correct_index: { type: Type.INTEGER },
                            explanation: { type: Type.STRING },
                            subject: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        res.json({ success: true, data: JSON.parse(cleanJson(response.text)) });
    } catch(e) {
        res.status(500).json({success: false, error: e.message});
    }
});

// --- PAYMENTS (Dormant but kept for future use) ---
const MERCH_ID = "PGTESTPAYUAT";
const SALT_KEY = "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
const SALT_INDEX = 1;
const PHONEPE_HOST = "https://api-preprod.phonepe.com/apis/pg-sandbox";

app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, userId, mobile } = req.body;
    const transactionId = "MT" + Date.now();
    const payload = {
      merchantId: MERCH_ID,
      merchantTransactionId: transactionId,
      merchantUserId: userId,
      amount: amount * 100,
      redirectUrl: `https://pyqverse.in/?payment=success&tid=${transactionId}`,
      redirectMode: "REDIRECT",
      callbackUrl: `https://pyqverse.in/api/payment-callback`,
      mobileNumber: mobile || "9999999999",
      paymentInstrument: { type: "PAY_PAGE" }
    };

    const bufferObj = Buffer.from(JSON.stringify(payload), "utf8");
    const base64EncodedPayload = bufferObj.toString("base64");
    const stringToSign = base64EncodedPayload + "/pg/v1/pay" + SALT_KEY;
    const sha256 = crypto.createHash('sha256').update(stringToSign).digest('hex');
    const checksum = sha256 + "###" + SALT_INDEX;

    const options = {
      method: 'POST',
      url: `${PHONEPE_HOST}/pg/v1/pay`,
      headers: { accept: 'application/json', 'Content-Type': 'application/json', 'X-VERIFY': checksum },
      data: { request: base64EncodedPayload }
    };

    const response = await axios.request(options);
    if (response.data.success) {
       res.json({ success: true, url: response.data.data.instrumentResponse.redirectInfo.url, transactionId });
    } else {
       res.status(400).json({ success: false, message: "Payment initiation failed" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint to verify payment status from Client
app.get('/api/check-status/:txnId', async (req, res) => {
    const { txnId } = req.params;
    const merchantId = MERCH_ID;
    const saltKey = SALT_KEY;
    const saltIndex = SALT_INDEX;

    const stringToSign = `/pg/v1/status/${merchantId}/${txnId}` + saltKey;
    const sha256 = crypto.createHash('sha256').update(stringToSign).digest('hex');
    const checksum = sha256 + "###" + saltIndex;

    try {
        const options = {
            method: 'GET',
            url: `${PHONEPE_HOST}/pg/v1/status/${merchantId}/${txnId}`,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                'X-MERCHANT-ID': merchantId
            }
        };

        const response = await axios.request(options);
        
        if (response.data.success && (response.data.code === 'PAYMENT_SUCCESS' || response.data.data.state === 'COMPLETED')) {
            res.json({ success: true, message: 'Payment Verified' });
        } else {
            res.json({ success: false, message: 'Payment Pending or Failed' });
        }
    } catch (error) {
        // Fallback for mock testing environment if PhonePe API is unreachable from local
        if (process.env.NODE_ENV !== 'production' && txnId.startsWith('pay_')) {
             res.json({ success: true, message: 'Mock Payment Verified' });
             return;
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/payment-callback', (req, res) => {
  console.log("Payment Callback Received:", req.body);
  res.send("Callback Received");
});

// For local development, bind to all interfaces
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend running on http://127.0.0.1:${PORT}`);
  });
}

// Export for Vercel
export default app;
