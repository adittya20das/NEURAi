import { z } from "zod";

import { NextResponse } from "next/server";

import { NeuraiCore } from "@/core/neurai-core";

import { createConfiguredRegistry } from "@/ai/providers/configured-registry";

const input = z.object({
  message: z.string().trim().min(1).max(12000),
  conversationId: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = input.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success)
    return NextResponse.json(
      {
        status: "invalid_request",
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid chat request.",
        },
      },
      { status: 400 },
    );

  const result = await new NeuraiCore(
    createConfiguredRegistry(),
  ).respond(parsed.data);

  return NextResponse.json(result, {
    status:
      result.status === "provider_unavailable" ||
      result.status === "tool_unavailable"
        ? 503
        : 200,
  });
}