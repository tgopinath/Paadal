import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/shell/sw-register";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Amazon Pulse", template: "%s · Amazon Pulse" },
  description: "Discover demand. Understand trends. Find opportunities. Product intelligence for Amazon India sellers.",
  applicationName: "Amazon Pulse",
  appleWebApp: { capable: true, title: "Amazon Pulse", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme="light": the product is light-only by design, so the native app looks stay light too.
    <html lang="en-IN" data-theme="light" data-m3-primary="#2563eb" className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
      <head>
        {/* Native app looks: Material Design 3 inside the Android app, Apple HIG inside the iOS app.
            Both scripts only tag <html> (k-android / k-ios) inside the apps or with ?app=android|ios; the website is unchanged. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts -- must tag <html> before first paint */}
        <script src="https://tgopinath.github.io/kolam-design-system/m3/kolam-m3.js" />
        {/* eslint-disable-next-line @next/next/no-sync-scripts -- must tag <html> before first paint */}
        <script src="https://tgopinath.github.io/kolam-design-system/ios/kolam-ios.js" />
        <link rel="stylesheet" href="https://tgopinath.github.io/kolam-design-system/m3/kolam-m3.css" />
        <link rel="stylesheet" href="https://tgopinath.github.io/kolam-design-system/ios/kolam-ios.css" />
        {/* eslint-disable-next-line @next/next/no-css-tags -- plain file so it loads after the kits */}
        <link rel="stylesheet" href="/native.css" />
      </head>
      <body className="min-h-dvh">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
