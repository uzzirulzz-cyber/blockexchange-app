import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser, logAction } from "@/lib/api-auth";

/**
 * KYC endpoints for the authenticated user.
 *
 * GET    /api/kyc           — list current user's KYC submissions
 * POST   /api/kyc           — submit a new KYC document (passport/license/ID)
 *
 * Document images are sent as base64 data URLs and stored in the DB.
 * Max size per image: ~3MB (enforced).
 */

const ALLOWED_DOC_TYPES = ["PASSPORT", "DRIVING_LICENSE", "NATIONAL_ID"];
const MAX_IMAGE_SIZE = 4_000_000; // ~3MB base64

function validateDataUrl(s: string): boolean {
  return typeof s === "string" && s.startsWith("data:image/") && s.length <= MAX_IMAGE_SIZE;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const docs = await db.kycDocument.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documents: docs });
  } catch (err) {
    console.error("[kyc GET] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { docType, frontImage, backImage, selfieImage } = body ?? {};

    if (!ALLOWED_DOC_TYPES.includes(docType)) {
      return NextResponse.json(
        { error: "Invalid document type. Must be one of: passport, driving license, national ID" },
        { status: 400 }
      );
    }

    if (!validateDataUrl(frontImage)) {
      return NextResponse.json(
        { error: "Front image is required and must be a valid image (max 3MB)" },
        { status: 400 }
      );
    }

    // Passport = single page (no back). License + ID require back.
    if (docType !== "PASSPORT" && !validateDataUrl(backImage)) {
      return NextResponse.json(
        { error: "Back of document is required for license/ID uploads" },
        { status: 400 }
      );
    }

    if (backImage && !validateDataUrl(backImage)) {
      return NextResponse.json({ error: "Back image too large (max 3MB)" }, { status: 400 });
    }

    if (selfieImage && !validateDataUrl(selfieImage)) {
      return NextResponse.json({ error: "Selfie image too large (max 3MB)" }, { status: 400 });
    }

    // Reject if user already has an APPROVED or PENDING KYC for this type
    const existing = await db.kycDocument.findFirst({
      where: {
        userId: user.id,
        docType,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: `You already have a ${existing.status.toLowerCase()} ${docType.toLowerCase().replace("_", " ")} submission` },
        { status: 409 }
      );
    }

    const doc = await db.kycDocument.create({
      data: {
        userId: user.id,
        docType,
        frontImage,
        backImage: backImage || null,
        selfieImage: selfieImage || null,
        status: "PENDING",
      },
    });

    // Update user's kycStatus to PENDING_REVIEW
    await db.user.update({
      where: { id: user.id },
      data: { kycStatus: "PENDING_REVIEW" },
    });

    await logAction({
      actorId: user.id,
      action: "KYC_SUBMITTED",
      targetId: doc.id,
      detail: `${docType} submitted for verification`,
    });

    return NextResponse.json({ ok: true, document: doc }, { status: 201 });
  } catch (err) {
    console.error("[kyc POST] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
