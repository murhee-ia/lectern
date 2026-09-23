import type { Metadata } from "next";
import { figtree, fredoka, nunito } from "@repo/ui/fonts";
import { SignOutButton } from "@repo/ui/components/customs/signout-button";
import { signOutAction } from "@repo/server/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lectern",
  description:
    "A team-aware AI explainer. Upload a file or describe a topic, and Lectern discusses it aloud.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <header className="flex items-center justify-end p-4">
          <SignOutButton action={signOutAction} />
        </header>
        {children}
      </body>
    </html>
  );
}
