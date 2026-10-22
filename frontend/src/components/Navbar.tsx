"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, GitFork, PlusCircle, Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const navLinks = [
  { href: "/", label: "Beranda", icon: BookOpen },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/input", label: "Proses Tafsir", icon: PlusCircle },
  { href: "/visualisasi", label: "Knowledge Graph", icon: GitFork },
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-emerald-900/40 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-emerald-500/20">ت</div>
          <span className="font-bold text-white tracking-tight">Tafsir<span className="text-emerald-500 font-extrabold">Ilmi</span></span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  active
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/40"
                    : "text-slate-700 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-emerald-500/10"
                }`}>
                <Icon size={14} className={active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-gray-400"} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}


          {/* Tombol Toggle Light / Dark Mode */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Ganti ke Mode Terang (Light Mode)" : "Ganti ke Mode Gelap (Dark Mode)"}
            className="ml-2 flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-all cursor-pointer shadow-sm active:scale-95"
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? (
              <>
                <Sun size={15} className="text-amber-400 animate-spin-slow" />
                <span className="hidden md:inline font-medium">Light</span>
              </>
            ) : (
              <>
                <Moon size={15} className="text-emerald-600" />
                <span className="hidden md:inline font-medium">Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

