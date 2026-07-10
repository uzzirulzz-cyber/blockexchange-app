import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, logAction } from "@/lib/api-auth";

/**
 * POST /api/admin/reset-balances — SUPER_ADMIN only
 *
 * Resets all CUSTOMER balances to 0.
 * - Sets balance = 0
 * - Sets frozenFunds = 0
 * - Creates a WalletLog entry per affected user (DEBIT)
 *
 * Body: { confirm: true }  (safety check)
 */
export async function POST(req: NextRequest) {
  const guard = await requireRole(req, "SUPER_ADMIN");
  if ("error" in guard) return guard.error;
  const { user: admin } = guard;

  try {
    const body = await req.json().catch(() => ({}));
    if (!body.confirm) {
      return NextResponse.json(
        { error: "Confirmation required. Set { confirm: true } to proceed." },
        { status: 400 }
      );
    }

    // Find all customers with non-zero balance or frozen funds
    const customers = await db.user.findMany({
      where: {
        role: "CUSTOMER",
        OR: [{ balance: { not: 0 } }, { frozenFunds: { not: 0 } }],
      },
      select: { id: true, balance: true, frozenFunds: true },
    });

    if (customers.length === 0) {
      return NextResponse.json({ ok: true, reset: 0, message: "No balances to reset." });
    }

    // Reset each customer + log
    let resetCount = 0;
    for (const c of customers) {
      const totalLost = Number(c.balance) + Number(c.frozenFunds);
      await db.$transaction([
        db.user.update({
          where: { id: c.id },
          data: { balance: 0, frozenFunds: 0 },
        }),
        db.walletLog.create({
          data: {
            userId: c.id,
            type: "DEBIT",
            amount: -totalLost,
            balanceAfter: 0,
            reference: "Balance reset to 0 by Super Admin",
          },
        }),
      ]);
      resetCount++;
    }

    await logAction({
      actorId: admin.id,
      action: "RESET_ALL_BALANCES",
      detail: `Reset ${resetCount} customer balances to 0`,
    });

    return NextResponse.json({
      ok: true,
      reset: resetCount,
      message: `Reset ${resetCount} customer balances to 0.`,
    });
  } catch (err) {
    console.error("[admin/reset-balances] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
