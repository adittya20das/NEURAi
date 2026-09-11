import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Neurai — Your intelligence, amplified", description: "A web-first AI assistant." };
export default function RootLayout({ children }: LayoutProps<"/">) { return <html lang="en"><body>{children}</body></html>; }
