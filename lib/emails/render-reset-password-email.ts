import { readFileSync } from "node:fs";
import { join } from "node:path";

const TEMPLATE_PATH = join(process.cwd(), "emails/reset-password.html");

export function renderResetPasswordEmail(options: {
  siteUrl: string;
  tokenHash: string;
}): string {
  const siteUrl = options.siteUrl.replace(/\/$/, "");
  const template = readFileSync(TEMPLATE_PATH, "utf8");

  return template
    .replaceAll("{{ .SiteURL }}", siteUrl)
    .replaceAll("{{ .TokenHash }}", options.tokenHash);
}
