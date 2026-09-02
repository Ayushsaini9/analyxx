import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Manage your ANALYXX AI profile, settings, and preferences.",
  robots: { index: false, follow: true },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
