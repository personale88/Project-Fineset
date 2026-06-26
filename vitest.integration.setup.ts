import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const directUrl = process.env.DIRECT_URL?.trim();
if (directUrl && process.env.INTEGRATION_ALLOW_REMOTE_DATABASE?.trim()) {
  process.env.DATABASE_URL = directUrl;
}

process.env.DEV_AUTH_BYPASS = "false";
