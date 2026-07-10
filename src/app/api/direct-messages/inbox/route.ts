import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/api-auth";

/**
 * GET /api/direct-messages/inbox
 *
 * Returns the user's conversation partners with last message + unread count.
 * Groups by partner (the other user in each conversation).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get all messages where user is sender or recipient
    const messages = await db.directMessage.findMany({
      where: {
        OR: [{ senderId: user.id }, { recipientId: user.id }],
      },
      include: {
        sender: { select: { id: true, name: true, email: true, photoUrl: true } },
        recipient: { select: { id: true, name: true, email: true, photoUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by partner
    const conversations = new Map<string, {
      partnerId: string;
      partnerName: string;
      partnerEmail: string;
      partnerPhoto: string;
      lastMessage: string;
      lastAt: string;
      unread: number;
    }>();

    for (const m of messages) {
      const partner = m.senderId === user.id ? m.recipient : m.sender;
      const existing = conversations.get(partner.id);
      const isUnread = m.recipientId === user.id && !m.read;

      if (!existing) {
        conversations.set(partner.id, {
          partnerId: partner.id,
          partnerName: partner.name,
          partnerEmail: partner.email,
          partnerPhoto: partner.photoUrl || "",
          lastMessage: m.body,
          lastAt: m.createdAt.toISOString(),
          unread: isUnread ? 1 : 0,
        });
      } else {
        if (isUnread) existing.unread++;
        // messages are sorted desc, so first one we see is the latest
      }
    }

    const totalUnread = Array.from(conversations.values()).reduce((s, c) => s + c.unread, 0);

    return NextResponse.json({
      conversations: Array.from(conversations.values()),
      totalUnread,
    });
  } catch (err) {
    console.error("[direct-messages/inbox] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
