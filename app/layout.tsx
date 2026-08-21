import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocSum — Document Summary Assistant",
  description: "Upload a PDF or image and get an AI-generated summary with key points.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
