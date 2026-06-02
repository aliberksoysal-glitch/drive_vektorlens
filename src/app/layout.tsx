import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppBackdrop } from "@/components/AppBackdrop";
import { AppProviders } from "@/components/AppProviders";
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
  title: "VEKTÖR LENS",
  description: "Sahanın dijital gözü, verinin güvenli yolu.",
  applicationName: "VEKTÖR LENS",
  appleWebApp: {
    capable: true,
    // black-translucent: status bar şeffaf olur, uygulama notch/Dynamic Island altına kadar uzar
    // Bu olmazsa PWA'da üstte beyaz bir bant kalır
    statusBarStyle: "black-translucent",
    title: "VEKTÖR LENS",
  },
  formatDetection: {
    // iOS'ta telefon numarası algılama → otomatik mavi link → layout bozulması
    telephone: false,
    email: false,
    address: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    // iOS homescreen icon — 180x180 modern iPhone standart boyutu
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  // light/dark mod için ayrı theme renkleri
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef5ff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  // maximumScale 5 → iOS erişilebilirlik zoom'una izin ver (Apple önerisi)
  // userScalable false → accessibility sorunları yaratabilir, kaldırıldı
  maximumScale: 5,
  // cover → notch/home indicator safe area'yı etkinleştirir
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="light" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AppBackdrop />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
