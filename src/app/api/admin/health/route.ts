import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { B2_BUCKET, b2Client } from "@/lib/r2-client";

export const dynamic = "force-dynamic";

type Check = { ok: boolean; ms: number; detail?: string };

async function timed(fn: () => Promise<unknown>): Promise<Check> {
  const start = Date.now();
  try {
    await fn();
    return { ok: true, ms: Date.now() - start };
  } catch (error) {
    const e = error as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };
    const status = e.$metadata?.httpStatusCode;
    return {
      ok: false,
      ms: Date.now() - start,
      detail:
        [e.name, status ? `HTTP ${status}` : null]
          .filter(Boolean)
          .join(" · ") || "Unreachable",
    };
  }
}

/** Read-only liveness checks for the admin overview (no test uploads). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [database, storage] = await Promise.all([
    timed(() => prisma.$queryRaw`SELECT 1`),
    B2_BUCKET
      ? timed(() => b2Client.send(new HeadBucketCommand({ Bucket: B2_BUCKET })))
      : Promise.resolve<Check>({
          ok: false,
          ms: 0,
          detail: "No bucket configured",
        }),
  ]);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    database,
    storage,
  });
}
