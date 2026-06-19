import { NextResponse } from "next/server";
import { renderResetPasswordEmail } from "@/lib/emails/render-reset-password-email";
import { getAppBaseUrl } from "@/lib/auth/get-app-url";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const siteUrl = process.env.NODE_ENV === "development" ? origin : getAppBaseUrl();

  const html = renderResetPasswordEmail({
    siteUrl,
    tokenHash: "preview-token-hash",
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
