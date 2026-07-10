import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, logAction } from "@/lib/api-auth";

/**
 * GET /api/admin/trade-settings — get current trade control mode
 * PATCH /api/admin/trade-settings — update mode + winRate
 *
 * Modes:
 *   "AUTO"         = random (natural market simulation)
 *   "ALWAYS_WIN"   = all trades win
 *   "ALWAYS_LOSE"  = all trades lose
 *   "WIN_RATE"     = percentage-based (winRate % chance of winning)
 */
export async function GET(req: NextRequest) {
  const guard = await requireRole(req, "SUPER_ADMIN");
  if ("error" in guard) return guard.error;

  try {
    let setting = await db.tradeSetting.findUnique({ where: { id: "global" } });
    if (!setting) {
      setting = await db.tradeSetting.create({ data: { id: "global", mode: "AUTO", winRate: 50 } });
    }
    return NextResponse.json({ setting });
  } catch (err) {
    console.error("[admin/trade-settings GET] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireRole(req, "SUPER_ADMIN");
  if ("error" in guard) return guard.error;
  const { user: admin } = guard;

  try {
    const body = await req.json().catch(() => ({}));
    const { mode, winRate } = body ?? {};

    const validModes = ["AUTO", "ALWAYS_WIN", "ALWAYS_LOSE", "WIN_RATE"];
    if (mode && !validModes.includes(mode)) {
      return NextResponse.json({ error: "Invalid mode. Must be AUTO, ALWAYS_WIN, ALWAYS_LOSE, or WIN_RATE" }, { status: 400 });
    }

    const data: any = {};
    if (mode) data.mode = mode;
    if (typeof winRate === "number") {
      if (winRate < 0 || winRate > 100) {
        return NextResponse.json({ error: "winRate must be 0-100" }, { status: 400 });
      }
      data.winRate = winRate;
    }

    const setting = await db.tradeSetting.upsert({
      where: { id: "global" },
      update: data,
      create: { id: "global", mode: mode || "AUTO", winRate: winRate ?? 50 },
    });

    await logAction({
      actorId: admin.id,
      action: "TRADE_SETTING_UPDATED",
      detail: `Mode: ${setting.mode}, WinRate: ${setting.winRate}%`,
    });

    return NextResponse.json({ ok: true, setting });
  } catch (err) {
    console.error("[admin/trade-settings PATCH] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
