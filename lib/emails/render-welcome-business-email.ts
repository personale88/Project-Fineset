import { readFileSync } from "node:fs";
import { join } from "node:path";

const TEMPLATE_PATH = join(process.cwd(), "emails/welcome-business.html");

export function renderWelcomeBusinessEmail(options: {
  siteUrl: string;
  ownerName: string;
  businessName: string;
}): string {
  const siteUrl = options.siteUrl.replace(/\/$/, "");

  const template = readFileSync(TEMPLATE_PATH, "utf8");

  return template
    .replaceAll("{{ .SiteURL }}", siteUrl)
    .replaceAll("{{ .OwnerName }}", options.ownerName)
    .replaceAll("{{ .BusinessName }}", options.businessName);
}
