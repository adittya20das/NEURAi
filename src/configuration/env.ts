import "server-only";
export const env = { databaseUrl: process.env.DATABASE_URL, openAiApiKey: process.env.OPENAI_API_KEY, openAiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini", geminiApiKey: process.env.GEMINI_API_KEY } as const;
