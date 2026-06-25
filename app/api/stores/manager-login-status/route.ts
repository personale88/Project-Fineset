import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import {
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { hasExistingBusinessOwnerLogin } from "@/lib/services/manager-stores";
import { z } from "zod";

const querySchema = z.object({
  email: z.string().min(1),
});

/**
 * GET /api/stores/manager-login-status?email=
 * Admin: whether a store-manager login already exists for this email.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["MASTER_ADMIN"])) return unauthorized();

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      email: searchParams.get("email") ?? "",
    });
    if (!parsed.success) {
      return NextResponse.json({ hasExistingLogin: false });
    }

    const hasExistingLogin = await hasExistingBusinessOwnerLogin(parsed.data.email);
    return NextResponse.json({ hasExistingLogin });
  } catch (error) {
    return handleRouteError(error);
  }
}
