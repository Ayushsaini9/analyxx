import { Metadata } from "next";
import BreadcrumbSchema from "../components/BreadcrumbSchema";

export const metadata: Metadata = {
  title: "About Us — Our Mission to Democratize Exam Intelligence",
  description:
    "Learn how ANALYXX AI uses NLP and machine learning to analyze 50,000+ exam papers with 94% accuracy. AI-powered predictions for JEE, NEET, UPSC, GATE, CAT, and CBSE exams.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About ANALYXX AI — AI-Powered Exam Intelligence",
    description:
      "Building the future of exam preparation with AI. 50,000+ papers analyzed, 10,000+ students, 94% prediction accuracy.",
    url: "https://analyxx.com/about",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", href: "/" },
          { name: "About", href: "/about" },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "About ANALYXX AI",
            description:
              "ANALYXX AI uses NLP and machine learning to analyze 50,000+ exam papers and predict high-probability topics for upcoming exams.",
            url: "https://analyxx.com/about",
            mainEntity: {
              "@type": "Organization",
              name: "ANALYXX AI",
              url: "https://analyxx.com",
              foundingDate: "2026",
              description:
                "AI-powered exam preparation platform for JEE, NEET, UPSC, GATE, CAT, CBSE & RTU exams",
              email: "analyxai@gmail.com",
              numberOfEmployees: { "@type": "QuantitativeValue", value: 5 },
              knowsAbout: [
                "Artificial Intelligence",
                "Natural Language Processing",
                "Exam Preparation",
                "Previous Year Papers Analysis",
                "Topic Prediction",
              ],
            },
          }),
        }}
      />
      {children}
    </>
  );
}
