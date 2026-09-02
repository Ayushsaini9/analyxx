import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analyze Previous Year Papers — AI-Powered Exam Predictions",
  description:
    "Upload your previous year question papers and get AI-powered analysis with topic predictions, frequency heatmaps, and smart study plans. Supports JEE, NEET, UPSC, GATE, CAT, CBSE & RTU exams.",
  alternates: { canonical: "/upload" },
  openGraph: {
    title: "Analyze Papers with AI | ANALYXX AI",
    description:
      "Upload previous year exam papers. Get instant AI predictions, topic analysis, and study insights in under 2 minutes.",
    url: "https://analyxx.com/upload",
  },
};

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
