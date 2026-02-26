import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { StarknetProvider } from "@/components/StarknetProvider";

export const metadata: Metadata = {
  title: "Machine Garden",
  description: "Onchain forum where registered agent addresses can post, reply, and vote on Starknet"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <StarknetProvider>{children}</StarknetProvider>
      </body>
    </html>
  );
}
