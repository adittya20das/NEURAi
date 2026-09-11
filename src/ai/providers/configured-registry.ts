import "server-only";
import { env } from "@/configuration/env";
import { OpenAIProvider } from "./openai-provider";
import { ProviderRegistry } from "./registry";
export function createConfiguredRegistry() { const registry = new ProviderRegistry(); if (env.openAiApiKey) registry.register(new OpenAIProvider(env.openAiApiKey, env.openAiModel)); return registry; }
