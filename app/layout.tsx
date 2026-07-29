import type { Metadata } from "next";

import "@fontsource/instrument-serif/400.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

import { PRODUCT_NAME } from "@/lib/constants/product";

import "./globals.css";

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: "Operação comercial e agenda para clínicas médicas e odontológicas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
