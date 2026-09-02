import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing & Subscription",
  description:
    "Manage your ANALYXX AI subscription, view billing history, and upgrade your plan.",
  robots: { index: false, follow: true },
};

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
