import type { Metadata } from "next";

// Payment pages should NOT be indexed
export const metadata: Metadata = {
  title: 'Payment - ZeFile',
  description: 'Complete your payment on ZeFile.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
