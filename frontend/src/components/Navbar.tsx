"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, GitFork, PlusCircle } from "lucide-react";

const navLinks = [
  { href: "/", label: "Beranda", icon: BookOpen },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/input", label: "Proses Tafsir", icon: PlusCircle },
  { href: "/visualisasi", label: "Knowledge Graph", icon: GitFork },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-emerald-900/40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-sm font-bold">ت</div>
          <span className="font-semibold text-white">Tafsir<span className="text-emerald-400">Ilmi</span></span>
        </Link>
        <div className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-emerald-500/20 text-emerald-400 font-medium"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}>
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
