
import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

// We use Gemma-2B because it is lightweight (~1.5GB) compared to Llama-3 (~4GB)
// Better for mobile users in India.
const SELECTED_MODEL = "gemma-2b-it-q4f32_1-MLC"; 

let engine: MLCEngine | null = null;
let isModelLoading = false;

export const initLocalModel = async (onProgress?: (progress: number) => void) => {
    if (engine) return engine;
    if (isModelLoading) return null; // Prevent double loading

    isModelLoading = true;
    try {
        engine = await CreateMLCEngine(
            SELECTED_MODEL,
            {
                initProgressCallback: (initProgress) => {
                    console.log("Local AI Loading:", initProgress.text, initProgress.progress);
                    if (onProgress) onProgress(initProgress.progress * 100);
                },
            }
        );
        isModelLoading = false;
        return engine;
    } catch (error) {
        console.error("Failed to load Local AI:", error);
        isModelLoading = false;
        throw error;
    }
};

export const generateLocalResponse = async (prompt: string, isJson: boolean = false) => {
    if (!engine) {
        throw new Error("MODEL_NOT_LOADED");
    }

    const messages = [
        { role: "system", content: "You are a helpful exam preparation assistant. Be concise." + (isJson ? " Output Valid JSON only." : "") },
        { role: "user", content: prompt }
    ];

    try {
        const reply = await engine.chat.completions.create({
            messages: messages as any,
            max_tokens: isJson ? 1024 : 512, // Limit tokens to save battery
            temperature: 0.3,
            response_format: isJson ? { type: "json_object" } : undefined
        });

        return reply.choices[0].message.content || "";
    } catch (e) {
        console.error("Local Generation Error:", e);
        throw e;
    }
};

export const isLocalAIReady = () => !!engine;
