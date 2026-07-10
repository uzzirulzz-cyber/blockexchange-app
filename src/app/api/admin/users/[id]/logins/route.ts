import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/api-auth";

/** GET /api/admin/users/[id]/logins — login history for a specific user. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole(req, "SUPER_ADMIN", "SUB_AGENT");
  if ("error" in guard) return guard.error;

  try {
    const { id } = await params;
    const logs = await db.loginLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ logs });
  } catch (err) {
    console.error("[admin/users/[id]/logins] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
