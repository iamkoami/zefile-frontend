import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Test Page",
  robots: { index: false, follow: false },
};

export default function TestPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
