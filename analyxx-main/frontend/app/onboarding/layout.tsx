import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome to ANALYXX AI",
  description:
    "Complete your profile setup to get personalized exam preparation with AI-powered analysis.",
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
