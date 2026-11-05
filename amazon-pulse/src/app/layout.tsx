import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/shell/sidebar";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Topbar } from "@/components/shell/topbar";
import { DemoBanner } from "@/components/shell/demo-banner";
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
    <html lang="en-IN" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
          Skip to content
        </a>
        <div className="flex min-h-dvh">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <DemoBanner />
            <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
              {children}
            </main>
          </div>
        </div>
        <MobileNav />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
