import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BaseballStats",
  description: "Baseball stats tracking and live scoring",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BaseballStats",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090b",
};

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/players", label: "Players" },
  { href: "/games", label: "Games" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-14 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M 5 19 Q 12 12 19 5" />
                <path d="M 5 5 Q 12 12 19 19" />
              </svg>
              <span className="hidden sm:inline">BaseballStats</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Mobile hamburger */}
            <MobileNav links={NAV_LINKS} />
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-4 sm:py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
