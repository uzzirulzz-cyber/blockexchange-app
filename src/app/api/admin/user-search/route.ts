import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/api-auth";

/**
 * GET /api/admin/user-search?q=...
 * Admin search by UID, email, or name. Returns up to 20 matches.
 */
export async function GET(req: NextRequest) {
  const guard = await requireRole(req, "SUPER_ADMIN", "SUB_AGENT");
  if ("error" in guard) return guard.error;

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q) {
      return NextResponse.json({ users: [] });
    }

    const users = await db.user.findMany({
      where: {
        OR: [
          { uid: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        uid: true,
        email: true,
        name: true,
        role: true,
        balance: true,
        frozenFunds: true,
        frozen: true,
        vipLevel: true,
        country: true,
        phone: true,
        kycStatus: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { trades: true } },
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (err) {
    console.error("[admin/user-search] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
