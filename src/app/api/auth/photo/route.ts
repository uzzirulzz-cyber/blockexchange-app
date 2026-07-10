import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser, toSafeUser, logAction } from "@/lib/api-auth";

/**
 * POST /api/auth/photo — upload profile photo.
 *
 * Body: { photo: "<base64 data URL>" }
 * Max size: ~2MB (enforced by checking string length).
 * Stored as base64 data URL in User.photoUrl — no external storage needed.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const photo = String(body.photo || "");

    if (!photo) {
      return NextResponse.json({ error: "Photo is required" }, { status: 400 });
    }

    // Validate it's a data URL with an image MIME type
    if (!photo.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Photo must be a base64 data URL starting with data:image/" },
        { status: 400 }
      );
    }

    // Enforce max size (~2MB = ~2.67M base64 chars)
    const MAX_SIZE = 3_000_000;
    if (photo.length > MAX_SIZE) {
      return NextResponse.json(
        { error: "Photo too large. Max 2MB. Try a smaller or more compressed image." },
        { status: 400 }
      );
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: { photoUrl: photo },
    });

    await logAction({
      actorId: user.id,
      action: "PHOTO_UPLOADED",
      detail: `Profile photo updated (${Math.round(photo.length / 1024)}KB)`,
    });

    return NextResponse.json({ user: toSafeUser(updated) });
  } catch (err) {
    console.error("[auth/photo POST] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE /api/auth/photo — remove profile photo. */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: { photoUrl: "" },
    });

    await logAction({
      actorId: user.id,
      action: "PHOTO_REMOVED",
      detail: "Profile photo removed",
    });

    return NextResponse.json({ user: toSafeUser(updated) });
  } catch (err) {
    console.error("[auth/photo DELETE] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
