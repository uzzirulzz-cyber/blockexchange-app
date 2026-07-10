import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, logAction } from "@/lib/api-auth";

/**
 * Admin KYC endpoints (SUPER_ADMIN only).
 *
 * GET   /api/admin/kyc              — list all KYC submissions (filter by ?status=)
 * GET   /api/admin/kyc?id=...        — get a specific document with user info
 * PATCH /api/admin/kyc               — approve or reject a document
 *   Body: { id, action: "APPROVE" | "REJECT", rejectReason? }
 */

export async function GET(req: NextRequest) {
  const guard = await requireRole(req, "SUPER_ADMIN");
  if ("error" in guard) return guard.error;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const id = searchParams.get("id");

    if (id) {
      // Single document with user info
      const doc = await db.kycDocument.findUnique({
        where: { id: String(id) },
        include: {
          user: {
            select: { id: true, uid: true, name: true, email: true, phone: true, country: true },
          },
        },
      });
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ document: doc });
    }

    const docs = await db.kycDocument.findMany({
      where: status ? { status: String(status).toUpperCase() } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: {
          select: { id: true, uid: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ documents: docs });
  } catch (err) {
    console.error("[admin/kyc GET] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireRole(req, "SUPER_ADMIN");
  if ("error" in guard) return guard.error;
  const { user: admin } = guard;

  try {
    const body = await req.json().catch(() => ({}));
    const { id, action, rejectReason } = body ?? {};

    if (!id || !action) {
      return NextResponse.json({ error: "id and action required" }, { status: 400 });
    }

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Action must be APPROVE or REJECT" }, { status: 400 });
    }

    const doc = await db.kycDocument.findUnique({ where: { id: String(id) } });
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    if (doc.status !== "PENDING") {
      return NextResponse.json({ error: "Document already reviewed" }, { status: 400 });
    }

    if (action === "APPROVE") {
      await db.$transaction([
        db.kycDocument.update({
          where: { id: doc.id },
          data: {
            status: "APPROVED",
            reviewedById: admin.id,
            reviewedAt: new Date(),
          },
        }),
        db.user.update({
          where: { id: doc.userId },
          data: { kycStatus: "VERIFIED" },
        }),
        db.notification.create({
          data: {
            userId: doc.userId,
            title: "KYC Verified ✓",
            body: `Your ${doc.docType.toLowerCase().replace("_", " ")} has been approved. Your account is now verified.`,
            type: "success",
          },
        }),
      ]);
      await logAction({
        actorId: admin.id,
        action: "KYC_APPROVED",
        targetId: doc.id,
        detail: `${doc.docType} approved for user ${doc.userId}`,
      });
    } else {
      // REJECT
      const reason = String(rejectReason || "Document rejected").slice(0, 500);
      await db.$transaction([
        db.kycDocument.update({
          where: { id: doc.id },
          data: {
            status: "REJECTED",
            rejectReason: reason,
            reviewedById: admin.id,
            reviewedAt: new Date(),
          },
        }),
        db.user.update({
          where: { id: doc.userId },
          data: { kycStatus: "REJECTED" },
        }),
        db.notification.create({
          data: {
            userId: doc.userId,
            title: "KYC Rejected",
            body: `Your ${doc.docType.toLowerCase().replace("_", " ")} was rejected. Reason: ${reason}. Please resubmit with a clearer photo.`,
            type: "error",
          },
        }),
      ]);
      await logAction({
        actorId: admin.id,
        action: "KYC_REJECTED",
        targetId: doc.id,
        detail: `${doc.docType} rejected: ${reason}`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/kyc PATCH] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
