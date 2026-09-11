import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";

import { auth } from "@/authentication/auth";
import { db } from "@/database/client";
import { memories } from "@/database/schema";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "UNAUTHENTICATED" },
        { status: 401 },
      );
    }

    const result = await db
      .select()
      .from(memories)
      .where(eq(memories.userId, session.user.id))
      .orderBy(asc(memories.createdAt));

    return NextResponse.json({
      memories: result,
    });
  } catch (error) {
    console.error("GET /api/memories error:", error);

    return NextResponse.json(
      { error: "Unable to load memories." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "UNAUTHENTICATED" },
        { status: 401 },
      );
    }

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

    const id = crypto.randomUUID();

    const [memory] = await db
      .insert(memories)
      .values({
        id,
        userId: session.user.id,
        content,
        category: category || "general",
        data: {},
      })
      .returning();

    return NextResponse.json(
      { memory },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/memories error:", error);

    return NextResponse.json(
      { error: "Unable to create memory." },
      { status: 500 },
    );
  }
}
