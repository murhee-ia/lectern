import type { Metadata } from "next";
import { figtree, fredoka, nunito } from "@repo/ui/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lectern",
  description:
    "A team-aware AI explainer — upload a file or describe a topic, and Lectern discusses it aloud.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
