import type { Metadata, Viewport } from "next";
import { SerwistProvider } from "@serwist/turbopack/react";
import { Inter, Playfair_Display } from "next/font/google";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ChunkLoadRecovery } from "@/components/pwa/ChunkLoadRecovery";
import { PwaAssetRefresh } from "@/components/pwa/PwaAssetRefresh";
import { PwaDevCleanup } from "@/components/pwa/PwaDevCleanup";
import { PwaLoadingShell } from "@/components/pwa/PwaLoadingShell";
import { PwaServiceWorkerUpdate } from "@/components/pwa/PwaServiceWorkerUpdate";
import { Providers } from "@/components/providers";
import { PWA_ASSET_VERSION, PWA_CONFIG } from "@/lib/pwa/config";
import "@/styles/globals.css";

const isProd = process.env.NODE_ENV === "production";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const APP_TITLE = PWA_CONFIG.shareTitle;

export const metadata: Metadata = {
  applicationName: PWA_CONFIG.shortName,
  title: {
    default: APP_TITLE,
    template: `%s | ${PWA_CONFIG.shortName}`,
  },
  description: PWA_CONFIG.description,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: PWA_CONFIG.shortName,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: `/icons/icon-192x192.png?v=${PWA_ASSET_VERSION}`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: `/icons/icon-512x512.png?v=${PWA_ASSET_VERSION}`,
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: `/icons/icon-180x180.png?v=${PWA_ASSET_VERSION}`,
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    siteName: PWA_CONFIG.shortName,
    title: APP_TITLE,
    description: PWA_CONFIG.description,
  },
  twitter: {
    card: "summary",
    title: APP_TITLE,
    description: PWA_CONFIG.description,
  },
};

export const viewport: Viewport = {
  themeColor: PWA_CONFIG.themeColor,
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appShell = (
    <Providers>
      {!isProd ? <PwaDevCleanup /> : null}
      {isProd ? <PwaAssetRefresh /> : null}
      <PwaLoadingShell>{children}</PwaLoadingShell>
      {isProd ? <PwaServiceWorkerUpdate /> : null}
      {isProd ? <InstallPrompt /> : null}
      <ChunkLoadRecovery />
    </Providers>
  );

  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} min-h-screen`}>
        {isProd ? (
          <SerwistProvider swUrl="/serwist/sw.js">{appShell}</SerwistProvider>
        ) : (
          appShell
        )}
      </body>
    </html>
  );
}
