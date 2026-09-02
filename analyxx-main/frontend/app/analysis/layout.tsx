import { Metadata } from "next";
import BreadcrumbSchema from "../components/BreadcrumbSchema";

export const metadata: Metadata = {
  title: "AI Exam Analysis — Cross-Year Pattern Detection & Topic Predictions",
  description:
    "Get detailed AI-driven analysis of exam patterns and topics. Analyze previous year papers for CBSE, RTU, JEE, NEET, UPSC, GATE & CAT exams — AI detects cross-year patterns and predicts high-probability questions.",
  alternates: { canonical: "/analysis" },
  openGraph: {
    title: "AI Exam Analysis — Pattern Detection | ANALYXX AI",
    description:
      "Cross-year pattern analysis powered by AI. Select your exam and subject for instant topic frequency analysis and predictions.",
    url: "https://analyxx.com/analysis",
  },
  keywords: [
    "exam analysis",
    "pattern analysis",
    "cross-year analysis",
    "topic frequency analysis",
    "exam pattern detection",
    "AI exam analysis",
    "previous year paper analysis",
  ],
};

export default function AnalysisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", href: "/" },
          { name: "Exam Analysis", href: "/analysis" },
        ]}
      />
      {children}
    </>
  );
}
