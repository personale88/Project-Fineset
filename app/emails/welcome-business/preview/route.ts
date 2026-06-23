import { NextResponse } from "next/server";
import { renderWelcomeBusinessEmail } from "@/lib/emails/render-welcome-business-email";
import { getAppBaseUrl } from "@/lib/auth/get-app-url";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const siteUrl = process.env.NODE_ENV === "development" ? origin : getAppBaseUrl();

  const html = renderWelcomeBusinessEmail({
    siteUrl,
    ownerName: "Aditya",
    businessName: "Sharma Jewellers",
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
