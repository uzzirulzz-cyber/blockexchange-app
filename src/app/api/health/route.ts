import { NextResponse } from "next/server";

/**
 * GET /api/health — deployment health check.
 *
 * Returns the status of every required env var + whether the Prisma client
 * loaded + whether the DB tables exist. Use this to debug "Internal server
 * error" on fresh deployments.
 *
 * Common issue: if db_connection shows ok=false with "relation does not exist",
 * you need to run `bun run db:push` with your production DATABASE_URL set.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // 1. Env vars
  for (const v of ["DATABASE_URL", "DIRECT_URL", "MONGODB_URI"]) {
    checks[v] = { ok: !!process.env[v], detail: process.env[v] ? "(set)" : "MISSING — set this in your deployment platform's env vars" };
  }

  // 2. Prisma client load
  try {
    const mod = await import("@prisma/client");
    checks["prisma_client"] = {
      ok: !!mod.PrismaClient,
      detail: mod.PrismaClient ? "loaded" : "PrismaClient export missing — run 'bun run db:generate' or 'prisma generate'",
    };
  } catch (err: any) {
    checks["prisma_client"] = { ok: false, detail: err?.message || "import failed" };
  }

  // 3. DB connection + table check
  if (process.env.DATABASE_URL) {
    try {
      const { db } = await import("@/lib/db");
      // Try to count users — if the table doesn't exist, this throws
      const userCount = await db.user.count();
      checks["db_connection"] = { ok: true, detail: `connected (${userCount} users in DB)` };
      checks["db_tables_exist"] = { ok: true, detail: "User table accessible" };
    } catch (err: any) {
      const msg = String(err?.message || "");
      const isMissingTable = msg.includes("does not exist") || msg.includes("no such table") || msg.includes("P2021");
      checks["db_connection"] = {
        ok: false,
        detail: isMissingTable
          ? "Connected to DB but tables are missing. Run: bun run db:push (with DATABASE_URL pointing to this DB)"
          : msg.slice(0, 200),
      };
      checks["db_tables_exist"] = { ok: false, detail: "Tables not created — run 'bun run db:push'" };
    }
  } else {
    checks["db_connection"] = { ok: false, detail: "skipped (DATABASE_URL not set)" };
    checks["db_tables_exist"] = { ok: false, detail: "skipped (no DATABASE_URL)" };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    {
      ok: allOk,
      checks,
      node_env: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      next_step: allOk
        ? "Everything looks good. Try logging in."
        : "Fix the failing checks above. Most common: set env vars + run 'bun run db:push'.",
    },
    { status: allOk ? 200 : 500 }
  );
}
