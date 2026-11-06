import type { Metadata } from "next";
import Header from "@/components/portfolio/Header";
import Footer from "@/components/portfolio/Footer";
import ChatWidget from "@/components/cobrowse/ChatWidget";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alex Rivera · Portfolio",
  description: "Sample portfolio with an AI co-browsing assistant.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
        <ChatWidget />
      </body>
    </html>
  );
}
