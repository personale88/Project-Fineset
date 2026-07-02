import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, getServerSession, requireRole, unauthorized } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api/route-handler";
import { reverseGeocodeLocation } from "@/lib/field-force/reverse-geocode";

const querySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STAFF", "STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      latitude: searchParams.get("latitude"),
      longitude: searchParams.get("longitude"),
    });
    if (!parsed.success) return badRequest(parsed.error.flatten());

    const address = await reverseGeocodeLocation(
      parsed.data.latitude,
      parsed.data.longitude,
    );

    if (!address) {
      return NextResponse.json(
        { message: "Could not resolve address for this location." },
        { status: 404 },
      );
    }

    return NextResponse.json({ address }, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
