import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "S3 Dropzone",
  description: "Upload files and folders to your S3 bucket while preserving structure."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
