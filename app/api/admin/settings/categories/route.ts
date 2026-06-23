import { NextResponse } from "next/server";
import { logAuthEvent } from "@/lib/auth/audit";
import { isAdminPortalSession } from "@/lib/auth/require-admin-permission";
import { getServerSession, unauthorized } from "@/lib/auth/session";
import {
  storeCategoryCreateSchema,
  storeCategoryDeleteSchema,
  storeCategoryUpdateSchema,
} from "@/lib/platform/settings-schema";
import {
  createStoreCategoryOption,
  deleteStoreCategoryOption,
  listAdminStoreCategories,
  updateStoreCategoryOption,
} from "@/lib/services/store-category-admin";

export async function GET() {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (!isAdminPortalSession(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const categories = await listAdminStoreCategories();
  return NextResponse.json({ categories });
}

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
  const parsed = storeCategoryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const category = await createStoreCategoryOption(parsed.data.name);
    await logAuthEvent({
      event: "STORE_CATEGORY_CREATED",
      email: session.email,
      authId: session.userId,
      metadata: { name: category.name },
    });
    return NextResponse.json({ category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create category.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (session.role !== "MASTER_ADMIN") {
    return NextResponse.json(
      { message: "Only master admins can manage store categories." },
      { status: 403 },
    );
  }

  const body: unknown = await req.json();
  const parsed = storeCategoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const category = await updateStoreCategoryOption(parsed.data);
    await logAuthEvent({
      event: "STORE_CATEGORY_UPDATED",
      email: session.email,
      authId: session.userId,
      metadata: {
        name: parsed.data.name,
        label: parsed.data.label,
        newName: parsed.data.newName,
      },
    });
    return NextResponse.json({ category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update category.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (session.role !== "MASTER_ADMIN") {
    return NextResponse.json(
      { message: "Only master admins can manage store categories." },
      { status: 403 },
    );
  }

  const body: unknown = await req.json();
  const parsed = storeCategoryDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await deleteStoreCategoryOption(parsed.data.name);
    await logAuthEvent({
      event: "STORE_CATEGORY_DELETED",
      email: session.email,
      authId: session.userId,
      metadata: { name: parsed.data.name },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete category.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
