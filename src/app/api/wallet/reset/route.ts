import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser, logAction } from "@/lib/api-auth";

/**
 * POST /api/wallet/reset — current user resets their own balance to 0.
 *
 * Sets balance = 0, frozenFunds = 0.
 * Creates a WalletLog entry so the reset shows in transaction history.
 *
 * Body: { confirm: true }  (safety check)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Customers only" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    if (!body.confirm) {
      return NextResponse.json(
        { error: "Confirmation required. Set { confirm: true } to proceed." },
        { status: 400 }
      );
    }

    const u = await db.user.findUnique({ where: { id: user.id } });
    if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const totalLost = Number(u.balance) + Number(u.frozenFunds);
    if (totalLost === 0) {
      return NextResponse.json({ ok: true, message: "Balance already 0." });
    }

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { balance: 0, frozenFunds: 0 },
      }),
      db.walletLog.create({
        data: {
          userId: user.id,
          type: "DEBIT",
          amount: -totalLost,
          balanceAfter: 0,
          reference: "Self-initiated balance reset to 0",
        },
      }),
    ]);

    await logAction({
      actorId: user.id,
      action: "SELF_RESET_BALANCE",
      detail: `Reset own balance to 0 (was ${totalLost} USDT)`,
    });

    return NextResponse.json({
      ok: true,
      balance: 0,
      message: "Balance reset to 0.",
    });
  } catch (err) {
    console.error("[wallet/reset] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
