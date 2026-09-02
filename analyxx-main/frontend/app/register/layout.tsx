import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up — Start Analyzing Free",
  description:
    "Create a free ANALYXX AI account. Upload previous year papers and get AI-powered exam predictions for JEE, NEET, UPSC, GATE, CBSE, RTU and more.",
  alternates: { canonical: "/register" },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
