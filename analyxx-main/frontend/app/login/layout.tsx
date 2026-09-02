import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description:
    "Sign in to ANALYXX AI to access AI-powered exam predictions, previous year paper analysis, and personalized study plans.",
  robots: { index: false, follow: true },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
