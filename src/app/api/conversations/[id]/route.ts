import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { auth } from "@/authentication/auth";
import { db } from "@/database/client";
import { conversations, messages } from "@/database/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type IncomingMessage = {
  id?: unknown;
  role?: unknown;
  content?: unknown;
};

export async function PUT(
  request: Request,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "UNAUTHENTICATED" },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        { error: "Conversation ID is required." },
        { status: 400 },
      );
    }

    const body = await request.json();

    const title =
      typeof body.title === "string" &&
      body.title.trim()
        ? body.title.trim().slice(0, 80)
        : "New conversation";

    const messagesInput: IncomingMessage[] =
      Array.isArray(body.messages)
        ? body.messages
        : [];

    const owned = await db
      .select({
        id: conversations.id,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, id),
          eq(
            conversations.userId,
            session.user.id,
          ),
        ),
      )
      .limit(1);

    if (owned.length === 0) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    const validMessages = messagesInput
      .filter((message) => {
        if (!message) return false;

        const validRole =
          message.role === "user" ||
          message.role === "assistant" ||
          message.role === "error";

        return (
          validRole &&
          typeof message.content === "string" &&
          message.content.trim().length > 0
        );
      })
      .map((message) => ({
        id:
          typeof message.id === "string" &&
          message.id.trim()
            ? message.id.trim()
            : crypto.randomUUID(),

        conversationId: id,

        role: message.role as
          | "user"
          | "assistant"
          | "error",

        content: String(message.content),
      }));

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(conversations)
        .set({
          title,
          updatedAt: now,
        })
        .where(
          and(
            eq(conversations.id, id),
            eq(
              conversations.userId,
              session.user.id,
            ),
          ),
        );

      await tx
        .delete(messages)
        .where(
          eq(messages.conversationId, id),
        );

      if (validMessages.length > 0) {
        await tx.insert(messages).values(
          validMessages.map((message, index) => ({
            ...message,

            // Preserve the exact order sent by AppShell.
            // Each message gets a unique timestamp.
            createdAt: new Date(
              now.getTime() + index,
            ),
          })),
        );
      }
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "PUT /api/conversations/[id] error:",
      error,
    );

    return NextResponse.json(
      {
        error: "Unable to update conversation.",
        details:
          process.env.NODE_ENV === "development" &&
          error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "UNAUTHENTICATED" },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    const deleted = await db
      .delete(conversations)
      .where(
        and(
          eq(conversations.id, id),
          eq(
            conversations.userId,
            session.user.id,
          ),
        ),
      )
      .returning({
        id: conversations.id,
      });

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/conversations/[id] error:",
      error,
    );

    return NextResponse.json(
      {
        error: "Unable to delete conversation.",
      },
      { status: 500 },
    );
  }
}