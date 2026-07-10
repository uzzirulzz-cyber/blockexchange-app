import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser, toSafeUser, logAction } from "@/lib/api-auth";

/**
 * PATCH /api/auth/profile — update the authenticated user's profile.
 *
 * Body: { name?, phone?, country? }
 * Email + role + balance are NOT editable here.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const updates: Record<string, string> = {};

    if (typeof body.name === "string" && body.name.trim().length >= 2) {
      updates.name = body.name.trim();
    }
    if (typeof body.phone === "string") {
      updates.phone = body.phone.trim();
    }
    if (typeof body.country === "string") {
      updates.country = body.country.trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: updates,
    });

    await logAction({
      actorId: user.id,
      action: "PROFILE_UPDATED",
      detail: `Updated: ${Object.keys(updates).join(", ")}`,
    });

    return NextResponse.json({ user: toSafeUser(updated) });
  } catch (err) {
    console.error("[auth/profile PATCH] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
