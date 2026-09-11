import "server-only";
import { auth } from "./auth";
export async function requireUserId() { const session = await auth(); if (!session?.user?.id) throw new Error("UNAUTHENTICATED"); return session.user.id; }
