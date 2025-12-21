
// Local AI service is disabled. Using Gemini Cloud API only.
// All native MLC/Web-LLM logic has been removed.

export const initLocalModel = async () => {
    return null;
};

export const generateLocalResponse = async () => {
    throw new Error("LOCAL_AI_DISABLED");
};

export const isLocalAIReady = () => false;
