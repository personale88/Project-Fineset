import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { logAuthEvent } from "@/lib/auth/audit";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { createStaff } from "@/lib/services/staff";
import { createStaffSchema } from "@/lib/validations/staff.schema";

interface StaffImportRow {
  name: string;
  email: string;
  employeeId: string;
  password: string;
  phone?: string;
}

function parseStaffCsv(csv: string): StaffImportRow[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  const pick = (cells: string[], key: string) => {
    const index = headers.indexOf(key);
    return index >= 0 ? cells[index]?.trim() ?? "" : "";
  };

  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    return {
      name: pick(cells, "name"),
      email: pick(cells, "email"),
      employeeId: pick(cells, "employeeid"),
      password: pick(cells, "password"),
      phone: pick(cells, "phone") || undefined,
    };
  });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER"])) return unauthorized();

    const { searchParams } = new URL(req.url);
    const resolved = await resolvePortalStoreIdForSession(
      session,
      searchParams.get("storeId"),
    );
    if (resolved instanceof NextResponse) return resolved;

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return badRequest({ message: "CSV file is required" });
    }

    const rows = parseStaffCsv(await file.text());
    if (rows.length === 0) {
      return badRequest({ message: "CSV has no data rows" });
    }

    let createdCount = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const parsed = createStaffSchema.safeParse({
        name: row.name,
        email: row.email,
        employeeId: row.employeeId,
        password: row.password,
        phone: row.phone,
        role: "STAFF",
      });

      if (!parsed.success) {
        errors.push({ row: i + 2, message: "Invalid staff row" });
        continue;
      }

      try {
        await createStaff(resolved, parsed.data);
        createdCount += 1;
      } catch (error) {
        errors.push({
          row: i + 2,
          message: error instanceof Error ? error.message : "Import failed",
        });
      }
    }

    void logAuthEvent({
      event: "STAFF_CREATED",
      email: session.email,
      metadata: { storeId: resolved, createdCount, failedCount: errors.length },
    });

    return NextResponse.json({ createdCount, failedCount: errors.length, errors });
  } catch (error) {
    return handleRouteError(error);
  }
}
