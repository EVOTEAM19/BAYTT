import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BAYTT - Plataforma de Cine con Inteligencia Artificial",
    template: "%s | BAYTT",
  },
  description:
    "Crea y disfruta películas generadas con inteligencia artificial. Plataforma de streaming con IA que te permite generar contenido cinematográfico único.",
  keywords: [
    "cine IA",
    "películas IA",
    "generación de video",
    "streaming",
    "inteligencia artificial",
    "creación de contenido",
    "video generativo",
  ],
  authors: [{ name: "BAYTT" }],
  creator: "BAYTT",
  publisher: "BAYTT",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "/",
    siteName: "BAYTT",
    title: "BAYTT - Plataforma de Cine con IA",
    description:
      "Crea y disfruta películas generadas con inteligencia artificial",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "BAYTT - Plataforma de Cine con IA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BAYTT - Plataforma de Cine con IA",
    description:
      "Crea y disfruta películas generadas con inteligencia artificial",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
