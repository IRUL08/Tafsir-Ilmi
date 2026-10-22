import Link from "next/link";
import { BookOpen, Brain, Network, ArrowRight, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 transition-colors duration-200">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-24 pb-32">
        {/* Background glow */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-400/15 dark:bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-teal-400/10 dark:bg-teal-500/8 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-sm font-semibold mb-8 shadow-xs">
            <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
            Sistem Berbasis AI · Knowledge Graph · Tafsir Ilmi
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6 tracking-tight">
            Eksplorasi Fenomena Alam
            <br />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              dalam Al-Qur&apos;an
            </span>
          </h1>

          <p className="text-lg text-slate-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Sistem cerdas berbasis <strong className="text-slate-900 dark:text-white font-semibold">AI (LLM)</strong> yang secara otomatis mengklasifikasikan
            ayat-ayat sains Al-Qur&apos;an dan membangun <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">Knowledge Graph</strong> untuk
            mengungkap relasi kausalitas antar konsep ilmiah dalam Tafsir Ilmi.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/25 hover:scale-[1.02] dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-gray-950"
            >
              Lihat Dashboard <ArrowRight size={16} />
            </Link>
            <Link
              href="/input"
              className="flex items-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-xs font-semibold rounded-xl transition-all hover:scale-[1.02] dark:bg-white/5 dark:hover:bg-white/10 dark:text-white dark:border-white/10 dark:shadow-none"
            >
              Proses Tafsir Baru
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Brain,
              title: "Klasifikasi AI Otomatis",
              desc: "LLM secara cerdas mengelompokkan teks tafsir ke dalam kategori sains: Meteorologi, Hidrologi, Geologi, dan lainnya.",
            },
            {
              icon: Network,
              title: "Knowledge Graph",
              desc: "Relasi antar konsep ilmiah divisualisasikan secara interaktif — bisa di-zoom, pan, dan diklik untuk detail lebih lanjut.",
            },
            {
              icon: BookOpen,
              title: "Sumber Kemenag RI",
              desc: "Terjemahan Al-Qur'an dari Kementerian Agama RI (versi resmi) digunakan sebagai sumber data utama yang valid secara akademis.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all group hover:-translate-y-1 dark:bg-white/3 dark:border-white/8 dark:hover:border-emerald-500/30 dark:shadow-none"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-700 dark:text-emerald-400 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <Icon size={20} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-base">{title}</h3>
              <p className="text-sm text-slate-600 dark:text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border border-emerald-200/80 shadow-sm dark:bg-gradient-to-br dark:from-emerald-950/50 dark:to-teal-950/30 dark:border-emerald-800/30 dark:shadow-none">
            <div className="grid grid-cols-3 gap-8 text-center">
              {[
                { value: "25+", label: "Ayat Fenomena Alam" },
                { value: "5", label: "Kategori Topik" },
                { value: "AI", label: "Ekstraksi Otomatis" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 mb-1">{value}</div>
                  <div className="text-sm text-slate-600 dark:text-gray-400 font-medium">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
