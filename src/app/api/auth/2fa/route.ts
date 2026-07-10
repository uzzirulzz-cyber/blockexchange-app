import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser, toSafeUser, logAction } from "@/lib/api-auth";
import { createHash, randomBytes } from "node:crypto";

/**
 * 2FA endpoints — lightweight implementation.
 *
 * POST   /api/auth/2fa        → Enable 2FA, returns 8 recovery codes
 * DELETE /api/auth/2fa        → Disable 2FA
 * GET    /api/auth/2fa/status  → Check if 2FA is enabled
 *
 * Note: This is a simplified 2FA — it generates recovery codes and sets a flag.
 * For full TOTP (Google Authenticator), you'd add a TOTP library + QR code.
 * For now, recovery codes serve as the second factor.
 */

function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(5);
    return bytes.toString("hex").toUpperCase().match(/.{4}/g)!.join("-");
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (dbUser.twoFactorEnabled) {
      return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 });
    }

    // Generate a pseudo-secret + 8 recovery codes
    const secret = randomBytes(20).toString("hex");
    const recoveryCodes = generateRecoveryCodes(8);
    const recoveryHashed = recoveryCodes
      .map((c) => createHash("sha256").update(c).digest("hex"))
      .join("|");

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorRecovery: recoveryHashed,
      },
    });

    await logAction({
      actorId: user.id,
      action: "2FA_ENABLED",
      detail: "Two-factor authentication enabled",
    });

    return NextResponse.json({
      user: toSafeUser(updated),
      recoveryCodes,
      message: "Save these recovery codes in a safe place. You'll need them if you lose access.",
    });
  } catch (err) {
    console.error("[auth/2fa POST] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: "",
        twoFactorRecovery: "",
      },
    });

    await logAction({
      actorId: user.id,
      action: "2FA_DISABLED",
      detail: "Two-factor authentication disabled",
    });

    return NextResponse.json({ user: toSafeUser(updated) });
  } catch (err) {
    console.error("[auth/2fa DELETE] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      enabled: user.twoFactorEnabled ?? false,
    });
  } catch (err) {
    console.error("[auth/2fa GET] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
