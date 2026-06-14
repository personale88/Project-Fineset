/**
 * predev hook: run prisma generate when possible.
 * On Windows/OneDrive the query engine DLL is locked while another dev server
 * is running — skip regeneration and reuse the existing client in that case.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const clientDir = path.join("node_modules", ".prisma", "client");
const indexPath = path.join(clientDir, "index.js");

function hasGeneratedClient() {
  return fs.existsSync(indexPath);
}

try {
  execSync("npx prisma generate", { stdio: "inherit" });
} catch {
  if (hasGeneratedClient()) {
    console.warn(
      "\n[predev] prisma generate skipped: query engine file is locked.",
    );
    console.warn(
      "[predev] Reusing existing Prisma client. Stop other `npm run dev` terminals if you changed schema.prisma.\n",
    );
    process.exit(0);
  }

  console.error(
    "\n[predev] prisma generate failed and no Prisma client exists.",
  );
  console.error(
    "[predev] Close other dev servers, pause OneDrive sync, then run: npm run db:generate\n",
  );
  process.exit(1);
}
