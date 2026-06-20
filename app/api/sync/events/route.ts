import { getServerSession, requireRole, unauthorized } from "@/lib/auth/session";
import { checkSseRateLimit, getRequestIdentifier } from "@/lib/rate-limit";
import { syncBroadcaster } from "@/lib/sync/broadcaster";
import {
  SSE_HEARTBEAT_MS,
  SSE_SERVER_MAX_CONNECTION_MS,
} from "@/lib/sync/constants";
import { resolveSyncScope } from "@/lib/sync/scope";
import { computeSyncVersionLight } from "@/lib/sync/version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const startedAt = Date.now();
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STAFF", "STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const identifier = await getRequestIdentifier();
    const rateLimit = await checkSseRateLimit(identifier);
    if (!rateLimit.success) {
      return new Response("Too many requests", { status: 429 });
    }

    const scope = resolveSyncScope(session);
    const initial = await computeSyncVersionLight(session);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        let closed = false;
        let lastSentVersion = initial.version;

        const close = () => {
          if (closed) return;
          closed = true;
          clearInterval(heartbeat);
          clearTimeout(forceCloseTimer);
          unsubscribe();
          try {
            controller.close();
          } catch {
            // stream already closed
          }
        };

        function send(data: unknown): void {
          if (closed) return;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        send(initial);

        const unsubscribe = syncBroadcaster.subscribe(scope, (payload) => {
          lastSentVersion = payload.version;
          send(payload);
        });

        const heartbeat = setInterval(() => {
          if (closed) return;
          void computeSyncVersionLight(session)
            .then((current) => {
              if (closed) return;
              if (current.version !== lastSentVersion) {
                lastSentVersion = current.version;
                send(current);
                return;
              }
              controller.enqueue(encoder.encode(": heartbeat\n\n"));
            })
            .catch(() => {
              if (!closed) {
                controller.enqueue(encoder.encode(": heartbeat\n\n"));
              }
            });
        }, SSE_HEARTBEAT_MS);

        const forceCloseTimer = setTimeout(() => {
          close();
        }, SSE_SERVER_MAX_CONNECTION_MS);

        req.signal.addEventListener("abort", () => {
          close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[api.sync.events] failed", {
      elapsedMs: Date.now() - startedAt,
      error,
    });
    return new Response(": sync unavailable\n\n", {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }
}
