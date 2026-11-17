import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Redline API",
  description: "Backend for Redline: the true 5-year cost of owning a used car.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>{children}</body>
    </html>
  );
}
