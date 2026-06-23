import { NextResponse } from "next/server";
import { logAuthEvent } from "@/lib/auth/audit";
import { getServerSession, unauthorized } from "@/lib/auth/session";
import { storeCategoryRestoreSchema } from "@/lib/platform/settings-schema";
import { restoreStoreCategoryOption } from "@/lib/services/store-category-admin";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (session.role !== "MASTER_ADMIN") {
    return NextResponse.json(
      { message: "Only master admins can manage store categories." },
      { status: 403 },
    );
  }

  const body: unknown = await req.json();
  const parsed = storeCategoryRestoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const category = await restoreStoreCategoryOption(parsed.data.name);
    await logAuthEvent({
      event: "STORE_CATEGORY_UPDATED",
      email: session.email,
      authId: session.userId,
      metadata: { name: parsed.data.name, action: "restore" },
    });
    return NextResponse.json({ category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not restore category.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
