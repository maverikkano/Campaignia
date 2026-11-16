import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = { title: APP_NAME, description: "A quiet commitment ledger: one goal, one stake, one week." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <StoreProvider>
          <header className="border-b">
            <div className="mx-auto flex max-w-[672px] items-center gap-5 px-5 py-3">
              <Link href="/" className="mr-auto font-serif text-[22px] text-foreground">
                {APP_NAME}
              </Link>
              <nav aria-label="Primary" className="flex gap-4 text-[15px]">
                <Link href="/" className="inline-flex min-h-[44px] items-center text-muted-foreground hover:text-foreground">
                  Now
                </Link>
                <Link href="/history" className="inline-flex min-h-[44px] items-center text-muted-foreground hover:text-foreground">
                  History
                </Link>
                <Link href="/backup" className="inline-flex min-h-[44px] items-center text-muted-foreground hover:text-foreground">
                  Backup
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-[672px] px-5 pb-20 pt-8">{children}</main>
        </StoreProvider>
      </body>
    </html>
  );
}
