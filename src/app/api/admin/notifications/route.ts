import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, logAction } from "@/lib/api-auth";

/** POST /api/admin/notifications — send a notification to a user (SUPER_ADMIN only). */
export async function POST(req: NextRequest) {
  const guard = await requireRole(req, "SUPER_ADMIN");
  if ("error" in guard) return guard.error;
  const { user: admin } = guard;

  try {
    const body = await req.json().catch(() => ({}));
    const { userId, title, body: notifBody, type } = body;

    if (!userId || !title || !notifBody) {
      return NextResponse.json(
        { error: "userId, title, and body are required" },
        { status: 400 }
      );
    }

    const target = await db.user.findUnique({ where: { id: String(userId) } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const notification = await db.notification.create({
      data: {
        userId: target.id,
        title: String(title),
        body: String(notifBody),
        type: String(type || "info"),
      },
    });

    await logAction({
      actorId: admin.id,
      action: "SEND_NOTIFICATION",
      targetId: target.id,
      detail: `${title}: ${notifBody}`.slice(0, 200),
    });

    return NextResponse.json({ ok: true, notification });
  } catch (err) {
    console.error("[admin/notifications POST] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** GET /api/admin/notifications?userId=... — list notifications for a specific user (admin view). */
export async function GET(req: NextRequest) {
  const guard = await requireRole(req, "SUPER_ADMIN");
  if ("error" in guard) return guard.error;

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const notifications = await db.notification.findMany({
      where: { userId: String(userId) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ notifications });
  } catch (err) {
    console.error("[admin/notifications GET] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
