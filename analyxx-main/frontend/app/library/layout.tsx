import { Metadata } from "next";
import BreadcrumbSchema from "../components/BreadcrumbSchema";

export const metadata: Metadata = {
  title:
    "PYQ Library — Previous Year Question Papers for JEE, NEET, UPSC, GATE, CBSE & RTU",
  description:
    "Browse and download previous year question papers for JEE Mains, JEE Advanced, NEET, UPSC CSE, CAT, GATE, CBSE 10th & 12th, and RTU. Free access to recent papers with AI-powered analysis.",
  alternates: { canonical: "/library" },
  openGraph: {
    title: "PYQ Library — Free Previous Year Question Papers | ANALYXX AI",
    description:
      "Access previous year question papers for JEE, NEET, UPSC, GATE, CAT, CBSE, and RTU exams. Download PDFs and analyze with AI.",
    url: "https://analyxx.com/library",
  },
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", href: "/" },
          { name: "PYQ Library", href: "/library" },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Previous Year Question Papers Library",
            description:
              "Browse and download previous year question papers for JEE, NEET, UPSC, GATE, CAT, CBSE, and RTU exams.",
            url: "https://analyxx.com/library",
            mainEntity: {
              "@type": "ItemList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "JEE Previous Year Papers",
                  url: "https://analyxx.com/library",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "NEET Previous Year Papers",
                  url: "https://analyxx.com/library",
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: "UPSC Previous Year Papers",
                  url: "https://analyxx.com/library",
                },
                {
                  "@type": "ListItem",
                  position: 4,
                  name: "GATE Previous Year Papers",
                  url: "https://analyxx.com/library",
                },
                {
                  "@type": "ListItem",
                  position: 5,
                  name: "CBSE Board Papers",
                  url: "https://analyxx.com/library",
                },
                {
                  "@type": "ListItem",
                  position: 6,
                  name: "RTU Previous Year Papers",
                  url: "https://analyxx.com/library",
                },
              ],
            },
          }),
        }}
      />
      {children}
    </>
  );
}
