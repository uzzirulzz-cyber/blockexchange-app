import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/api-auth";

/**
 * GET /api/users/search?q=...
 * Customer-accessible user search (for messaging).
 * Returns up to 20 matches. Excludes the current user.
 * Does NOT expose sensitive fields (no passwordHash, no balance).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const users = await db.user.findMany({
      where: {
        AND: [
          { id: { not: user.id } },
          {
            OR: [
              { uid: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        uid: true,
        email: true,
        name: true,
        photoUrl: true,
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (err) {
    console.error("[users/search] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
