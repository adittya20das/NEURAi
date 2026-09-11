import { asc, eq } from "drizzle-orm";

import { classifyTask } from "./classifier";
import type { CoreRequest, CoreResult } from "./contracts";
import { ProviderRegistry } from "@/ai/providers/registry";
import { toolForTask } from "@/tools/tool-manager";

import { auth } from "@/authentication/auth";
import { db } from "@/database/client";
import { memories } from "@/database/schema";

export class NeuraiCore {
  constructor(private registry: ProviderRegistry) {}

  async respond(request: CoreRequest): Promise<CoreResult> {
    const task = classifyTask(request.message);

    if (!request.message.trim()) {
      return {
        status: "invalid_request",
        task,
        tools: [],
        citations: [],
        error: {
          code: "INVALID_REQUEST",
          message: "A message is required.",
        },
      };
    }

    const tool = toolForTask(task);

    if (tool) {
      return {
        status: "tool_unavailable",
        task,
        tools: [{ kind: tool, status: "unavailable" }],
        citations: [],
        error: {
          code: "TOOL_UNAVAILABLE",
          message: `${tool} is not configured.`,
        },
      };
    }

    const provider = this.registry.select(task);

    if (!provider) {
      return {
        status: "provider_unavailable",
        task,
        tools: [],
        citations: [],
        error: {
          code: "PROVIDER_UNAVAILABLE",
          message: "No AI provider is configured.",
        },
      };
    }

    try {
      const session = await auth();

      let userMemories: {
        content: string;
        category: string;
      }[] = [];

      if (session?.user?.id) {
        const memoryRows = await db
          .select({
            content: memories.content,
            category: memories.category,
          })
          .from(memories)
          .where(eq(memories.userId, session.user.id))
          .orderBy(asc(memories.createdAt));

        userMemories = memoryRows
          .filter(
            (memory) =>
              typeof memory.content === "string" &&
              memory.content.trim().length > 0,
          )
          .slice(0, 50)
          .map((memory) => ({
            content: memory.content.trim(),
            category:
              typeof memory.category === "string" &&
              memory.category.trim().length > 0
                ? memory.category.trim()
                : "general",
          }));
      }

      const response = await provider.generate({
        message: request.message,
        task,
        context: {
          messages: (request.conversation ?? []).slice(-20),
          memories: userMemories,
        },
      });

      return {
        status: "completed",
        text: response.text,
        task,
        provider: provider.id,
        model: response.model,
        tools: [],
        citations: [],
      };
    } catch {
      return {
        status: "provider_unavailable",
        task,
        tools: [],
        citations: [],
        error: {
          code: "PROVIDER_REQUEST_FAILED",
          message: "The configured AI provider is unavailable.",
        },
      };
    }
  }
}