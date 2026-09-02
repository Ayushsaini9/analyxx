import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Study Roadmap — ANALYXX AI",
  description: "Explore 60+ skill roadmaps across programming, AI, web development, data science, and more. Track your progress with AI-powered study assistance.",
  alternates: { canonical: "/roadmap" },
};

export default function RoadmapLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
