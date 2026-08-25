import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CaterWise",
  description: "Web-based decision-support platform untuk membantu rumah makan prasmanan menentukan jumlah produksi makanan berdasarkan pola permintaan historis.",
  icons: {
    icon: "/logo/logo_bg.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakartaSans.variable} font-sans antialiased bg-gray-50`}
      >
        {children}
      </body>
    </html>
  );
}
