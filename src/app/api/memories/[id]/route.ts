import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { auth } from "@/authentication/auth";
import { db } from "@/database/client";
import { memories } from "@/database/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
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
    const body = await request.json();

    const content = String(body.content ?? "").trim();
    const category = String(
      body.category ?? "general",
    ).trim();

    if (!content) {
      return NextResponse.json(
        { error: "Memory content is required." },
        { status: 400 },
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: "Memory is too long." },
        { status: 400 },
      );
    }

    const [memory] = await db
      .update(memories)
      .set({
        content,
        category: category || "general",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(memories.id, id),
          eq(memories.userId, session.user.id),
        ),
      )
      .returning();

    if (!memory) {
      return NextResponse.json(
        { error: "Memory not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ memory });
  } catch (error) {
    console.error(
      "PUT /api/memories/[id] error:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to update memory." },
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
      .delete(memories)
      .where(
        and(
          eq(memories.id, id),
          eq(memories.userId, session.user.id),
        ),
      )
      .returning({ id: memories.id });

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Memory not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/memories/[id] error:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to delete memory." },
      { status: 500 },
    );
  }
}
