import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

function host(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

async function measureMs<T>(fn: () => Promise<T>): Promise<{ ms: number; ok: boolean; error?: string }> {
  const start = Date.now();
  try {
    await fn();
    return { ms: Date.now() - start, ok: true };
  } catch (error) {
    return {
      ms: Date.now() - start,
      ok: false,
      error: error instanceof Error ? error.message.slice(0, 200) : "unknown",
    };
  }
}

export async function GET(request: Request) {
  const headers = request.headers;
  const vercelId = headers.get("x-vercel-id");
  const edgeRegion = headers.get("x-vercel-edge-region");
  const deployedRegion = headers.get("x-vercel-region");

  const dbPing = await measureMs(() => prisma.$queryRaw`SELECT 1`);

  const targets = {
    dbSelect1Ms: 100,
  };

  return NextResponse.json({
    ok: dbPing.ok,
    runtime: {
      nodeEnv: process.env.NODE_ENV,
      vercelId,
      edgeRegion,
      deployedRegion,
    },
    dependencies: {
      smtpHost: host(process.env.SMTP_HOST),
      upstashHost: host(process.env.UPSTASH_REDIS_REST_URL),
      dbHost:
        process.env.DATABASE_URL?.match(/@([^/?]+)(?:\/|\?|$)/)?.[1] ?? null,
    },
    timings: {
      dbSelect1: dbPing,
    },
    targets,
    withinTargets: {
      dbSelect1: dbPing.ok && dbPing.ms <= targets.dbSelect1Ms,
    },
    hint: "Self-hosted: keep app server and PostgreSQL in the same region/network. Run npm run perf:diagnostic locally.",
  });
}
