import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";

import { auth } from "@/authentication/auth";
import { db } from "@/database/client";
import {
  conversations,
  messages,
} from "@/database/schema";

type IncomingMessage = {
  id?: string;
  role?: "user" | "assistant" | "error";
  content?: string;
};

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "UNAUTHENTICATED" },
        { status: 401 },
      );
    }

    const rows = await db
      .select({
        conversationId: conversations.id,
        conversationTitle: conversations.title,
        conversationCreatedAt: conversations.createdAt,
        conversationUpdatedAt: conversations.updatedAt,

        messageId: messages.id,
        messageRole: messages.role,
        messageContent: messages.content,
        messageCreatedAt: messages.createdAt,
      })
      .from(conversations)
      .leftJoin(
        messages,
        eq(
          conversations.id,
          messages.conversationId,
        ),
      )
      .where(
        eq(
          conversations.userId,
          session.user.id,
        ),
      )
      .orderBy(
        desc(conversations.updatedAt),
        asc(messages.createdAt),
        asc(messages.id),
      );

    const conversationMap = new Map<
      string,
      {
        id: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        messages: {
          id: string;
          role: "user" | "assistant" | "error";
          content: string;
        }[];
      }
    >();

    for (const row of rows) {
      let conversation =
        conversationMap.get(
          row.conversationId,
        );

      if (!conversation) {
        conversation = {
          id: row.conversationId,
          title: row.conversationTitle,
          createdAt:
            row.conversationCreatedAt,
          updatedAt:
            row.conversationUpdatedAt,
          messages: [],
        };

        conversationMap.set(
          row.conversationId,
          conversation,
        );
      }

      if (
        row.messageId &&
        row.messageRole &&
        row.messageContent !== null
      ) {
        conversation.messages.push({
          id: row.messageId,
          role: row.messageRole as
            | "user"
            | "assistant"
            | "error",
          content: row.messageContent,
        });
      }
    }

    return NextResponse.json({
      conversations: Array.from(
        conversationMap.values(),
      ),
    });
  } catch (error) {
    console.error(
      "GET /api/conversations error:",
      error,
    );

    return NextResponse.json(
      {
        error: "Unable to load conversations.",
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

export async function POST(
  request: Request,
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "UNAUTHENTICATED" },
        { status: 401 },
      );
    }

    const body = await request.json();

    const id =
      typeof body?.id === "string" &&
      body.id.trim()
        ? body.id.trim()
        : crypto.randomUUID();

    const title =
      typeof body?.title === "string" &&
      body.title.trim()
        ? body.title.trim().slice(0, 80)
        : "New conversation";

    const incomingMessages: IncomingMessage[] =
      Array.isArray(body?.messages)
        ? body.messages
        : [];

    const validMessages =
      incomingMessages.filter(
        (message) =>
          message &&
          (message.role === "user" ||
            message.role === "assistant" ||
            message.role === "error") &&
          typeof message.content === "string",
      );

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx.insert(conversations).values({
        id,
        userId: session.user.id,
        title,
        createdAt: now,
        updatedAt: now,
      });

      if (validMessages.length > 0) {
        await tx.insert(messages).values(
          validMessages.map((message, index) => ({
            id:
              typeof message.id === "string" &&
              message.id.trim()
                ? message.id.trim()
                : crypto.randomUUID(),

            conversationId: id,

            role: message.role!,

            content: message.content!,

            // Preserve the exact message order.
            createdAt: new Date(
              now.getTime() + index,
            ),
          })),
        );
      }
    });

    return NextResponse.json(
      {
        success: true,
        conversation: {
          id,
          title,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/conversations error:",
      error,
    );

    return NextResponse.json(
      {
        error: "Unable to create conversation.",
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