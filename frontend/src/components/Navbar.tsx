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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/85 dark:bg-gray-950/80 backdrop-blur-md border-b border-emerald-100 dark:border-emerald-900/40 shadow-xs dark:shadow-none transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition-transform group-hover:scale-105">
            ت
          </div>
          <span className="font-bold text-slate-900 dark:text-white tracking-tight text-lg">
            Tafsir<span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Ilmi</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold shadow-xs dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                    : "text-slate-600 dark:text-gray-400 hover:text-emerald-700 dark:hover:text-white hover:bg-emerald-50/60 dark:hover:bg-white/5 font-medium"
                }`}
              >
                <Icon size={15} className={active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-gray-400"} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}

          {/* Tombol Toggle Light / Dark Mode */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Ganti ke Mode Terang (Light Mode)" : "Ganti ke Mode Gelap (Dark Mode)"}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-xs active:scale-95 bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:hover:bg-emerald-500/20 dark:text-emerald-400"
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? (
              <>
                <Sun size={15} className="text-amber-400 animate-spin-slow" />
                <span className="hidden md:inline">Light</span>
              </>
            ) : (
              <>
                <Moon size={15} className="text-emerald-700" />
                <span className="hidden md:inline">Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
