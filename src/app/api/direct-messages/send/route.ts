import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser, logAction } from "@/lib/api-auth";

/**
 * POST /api/direct-messages/send
 * Body: { recipientId: string, body: string }
 *
 * Sends a direct message from the authenticated user to another user.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { recipientId, body: messageBody } = body ?? {};

    if (!recipientId || !messageBody) {
      return NextResponse.json(
        { error: "recipientId and body are required" },
        { status: 400 }
      );
    }

    const text = String(messageBody).trim();
    if (text.length === 0) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ error: "Message too long (max 2000 chars)" }, { status: 400 });
    }

    const recipient = await db.user.findUnique({ where: { id: String(recipientId) } });
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }
    if (recipient.id === user.id) {
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
    }

    const message = await db.directMessage.create({
      data: { senderId: user.id, recipientId: recipient.id, body: text },
    });

    await logAction({
      actorId: user.id,
      action: "DIRECT_MESSAGE_SENT",
      targetId: recipient.id,
      detail: "Sent a direct message",
    });

    return NextResponse.json({ ok: true, message }, { status: 201 });
  } catch (err) {
    console.error("[direct-messages/send] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
