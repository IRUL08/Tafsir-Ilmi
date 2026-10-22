import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/context/ThemeContext";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tafsir Ilmi - Sistem Klasifikasi & Knowledge Graph",
  description: "Sistem informasi berbasis AI untuk mengklasifikasikan ayat-ayat sains Al-Qur'an dan membangun Knowledge Graph secara otomatis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body className={`${geist.className} min-h-screen transition-colors duration-200`}>
        <ThemeProvider>
          <Navbar />
          <main className="pt-16">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}

