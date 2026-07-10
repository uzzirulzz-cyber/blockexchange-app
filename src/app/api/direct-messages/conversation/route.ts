import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/api-auth";

/**
 * GET /api/direct-messages/conversation?partnerId=...
 *
 * Returns all messages between the authenticated user and a partner.
 * Marks received messages as read.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partnerId");
    if (!partnerId) {
      return NextResponse.json({ error: "partnerId required" }, { status: 400 });
    }

    // Mark all messages FROM partner TO user as read
    await db.directMessage.updateMany({
      where: { senderId: String(partnerId), recipientId: user.id, read: false },
      data: { read: true },
    });

    const messages = await db.directMessage.findMany({
      where: {
        OR: [
          { senderId: user.id, recipientId: String(partnerId) },
          { senderId: String(partnerId), recipientId: user.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    const partner = await db.user.findUnique({
      where: { id: String(partnerId) },
      select: { id: true, name: true, email: true, photoUrl: true },
    });

    return NextResponse.json({ messages, partner });
  } catch (err) {
    console.error("[direct-messages/conversation] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
