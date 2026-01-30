import type { Metadata } from "next";

// Transfer download pages should NEVER be indexed for privacy
export const metadata: Metadata = {
  title: 'Download Transfer - ZeFile',
  description: 'Download your secure file transfer from ZeFile.',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export default function TransferLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
