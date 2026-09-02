import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import HelpChatbox from "./components/HelpChatbox";
import CookieConsent from "./components/CookieConsent";
import ThemeProvider from "./components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["200", "300", "400", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const siteUrl = "https://analyxx.com";

export const metadata: Metadata = {
  title: {
    default: "Previous Year Papers & AI Exam Predictions for JEE, NEET, UPSC | ANALYXX AI",
    template: "%s | ANALYXX AI",
  },
  description:
    "AI-powered exam preparation platform. Upload previous year papers for JEE, NEET, UPSC, GATE, CAT, CBSE & RTU — get topic predictions, pattern analysis, and smart study plans. 94% prediction accuracy.",
  metadataBase: new URL(siteUrl),
  alternates: { canonical: "/" },
  verification: {
    google: "tnEUYXrsIgMnKTbV83dUO1Igk1CfmOxV0KiBiXjqsUE",
  },
  openGraph: {
    type: "website",
    siteName: "ANALYXX AI",
    title: "ANALYXX AI — AI-Powered Exam Predictions & Paper Analysis",
    description:
      "Upload previous year papers. Get AI-powered topic predictions for JEE, NEET, UPSC, GATE, CAT, CBSE & RTU exams with 94% accuracy.",
    url: siteUrl,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ANALYXX AI — Exam Intelligence Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ANALYXX AI — AI-Powered Exam Predictions",
    description:
      "AI-powered exam predictions with 94% accuracy. Analyze previous year papers for JEE, NEET, UPSC, GATE, CAT, and more.",
    images: ["/og-image.png"],
  },
  keywords: [
    "previous year papers",
    "previous year question papers",
    "PYQ",
    "exam preparation",
    "JEE previous year papers",
    "NEET previous year papers",
    "UPSC previous year papers",
    "GATE previous year papers",
    "CAT previous year papers",
    "SSC previous year papers",
    "AI exam predictions",
    "predicted exam questions",
    "important questions for exam",
    "topic prediction",
    "exam pattern analysis",
    "JEE PYQ", "JEE previous year papers", "JEE Main PYQ",
    "NEET PYQ", "NEET previous year papers", "NEET Biology PYQ",
    "UPSC PYQ", "UPSC previous year papers", "UPSC Prelims PYQ",
    "GATE PYQ", "GATE previous year papers", "GATE CSE PYQ",
    "CAT PYQ", "CAT previous year papers", "CAT VARC PYQ",
    "SSC PYQ", "SSC CGL PYQ", "SSC previous year papers",
    "CBSE PYQ", "CBSE board papers", "CBSE 12th PYQ", "CBSE 10th PYQ",
    "RTU PYQ", "RTU pyqs", "RTU previous year question papers",
    "RTU Kota papers", "RTU B.Tech papers",
    "question paper analysis",
    "exam intelligence",
    "ANALYXX AI",
  ],
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics is loaded conditionally via CookieConsent component */}
        <link rel="dns-prefetch" href="https://api.analyxx.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://analyxx.com/#organization",
                  name: "ANALYXX AI",
                  url: "https://analyxx.com",
                  logo: {
                    "@type": "ImageObject",
                    url: "https://analyxx.com/favicon-512x512.png",
                    width: 512,
                    height: 512,
                  },
                  description:
                    "AI-powered exam preparation platform for JEE, NEET, UPSC, GATE, CAT, CBSE & RTU exams. Predicting questions with 94% accuracy.",
                  email: "contact@analyxx.com",
                  contactPoint: {
                    "@type": "ContactPoint",
                    email: "contact@analyxx.com",
                    contactType: "customer support",
                    availableLanguage: ["English", "Hindi"],
                  },
                  sameAs: [
                    "https://analyxx.com",
                  ],
                },
                {
                  "@type": "WebSite",
                  "@id": "https://analyxx.com/#website",
                  url: "https://analyxx.com",
                  name: "ANALYXX AI",
                  description:
                    "AI-powered exam preparation platform predicting questions with 94% accuracy for JEE, NEET, UPSC, GATE, CAT & SSC.",
                  publisher: {
                    "@id": "https://analyxx.com/#organization",
                  },
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: "https://analyxx.com/exams?q={search_term_string}",
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
                {
                  "@type": "SoftwareApplication",
                  name: "ANALYXX AI",
                  applicationCategory: "EducationalApplication",
                  operatingSystem: "Web",
                  url: "https://analyxx.com",
                  description:
                    "AI-powered exam preparation platform. Upload previous year papers, get topic predictions and pattern analysis.",
                  offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "INR",
                  },
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: "4.8",
                    ratingCount: "10000",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} ${inter.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
          <HelpChatbox />
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}
