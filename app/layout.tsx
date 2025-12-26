import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// TODO: Add Metropolis font
// When font files are ready, uncomment the following and add the font files to /public/fonts/metropolis/:
// import localFont from "next/font/local";
// const metropolis = localFont({
//   src: [
//     {
//       path: "../public/fonts/metropolis/Metropolis-Regular.woff2",
//       weight: "400",
//       style: "normal",
//     },
//     {
//       path: "../public/fonts/metropolis/Metropolis-Medium.woff2",
//       weight: "500",
//       style: "normal",
//     },
//     {
//       path: "../public/fonts/metropolis/Metropolis-SemiBold.woff2",
//       weight: "600",
//       style: "normal",
//     },
//     {
//       path: "../public/fonts/metropolis/Metropolis-Bold.woff2",
//       weight: "700",
//       style: "normal",
//     },
//   ],
//   variable: "--font-metropolis",
//   display: "swap",
//   fallback: ["system-ui", "arial"],
// });

export const metadata: Metadata = {
  title: "ZeFile - Partage de fichiers sécurisé",
  description: "Partagez vos fichiers en toute sécurité avec ZeFile",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
        style={{ fontFamily: "system-ui, arial" }}
      >
        {children}
      </body>
    </html>
  );
}
