import Link from "next/link";
import { BookOpen, Brain, Network, ArrowRight, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-24 pb-32">
        {/* Background glow */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-teal-500/8 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-8">
            <Sparkles size={14} />
            Sistem Berbasis AI · Knowledge Graph · Tafsir Ilmi
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            Eksplorasi Fenomena Alam
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              dalam Al-Qur&apos;an
            </span>
          </h1>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Sistem cerdas berbasis <strong className="text-white">AI (LLM)</strong> yang secara otomatis mengklasifikasikan
            ayat-ayat sains Al-Qur&apos;an dan membangun <strong className="text-white">Knowledge Graph</strong> untuk
            mengungkap relasi antar konsep ilmiah dalam Tafsir Ilmi.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/dashboard"
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/25">
              Lihat Dashboard <ArrowRight size={16} />
            </Link>
            <Link href="/input"
              className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition-all">
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
              color: "emerald",
              title: "Klasifikasi AI Otomatis",
              desc: "LLM secara cerdas mengelompokkan teks tafsir ke dalam kategori sains: Meteorologi, Hidrologi, Geologi, dan lainnya.",
            },
            {
              icon: Network,
              color: "teal",
              title: "Knowledge Graph",
              desc: "Relasi antar konsep ilmiah divisualisasikan secara interaktif — bisa di-zoom, pan, dan diklik untuk detail lebih lanjut.",
            },
            {
              icon: BookOpen,
              color: "cyan",
              title: "Sumber Kemenag RI",
              desc: "Terjemahan Al-Qur'an dari Kementerian Agama RI (versi resmi) digunakan sebagai sumber data utama yang valid secara akademis.",
            },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="p-6 rounded-2xl bg-white/3 border border-white/8 hover:border-emerald-500/30 transition-all group">
              <div className={`w-10 h-10 rounded-xl bg-${color}-500/15 flex items-center justify-center mb-4`}>
                <Icon size={20} className={`text-${color}-400`} />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-950/50 to-teal-950/30 border border-emerald-800/30">
            <div className="grid grid-cols-3 gap-8 text-center">
              {[
                { value: "25+", label: "Ayat Fenomena Alam" },
                { value: "5", label: "Kategori Topik" },
                { value: "AI", label: "Ekstraksi Otomatis" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div className="text-3xl font-bold text-emerald-400 mb-1">{value}</div>
                  <div className="text-sm text-gray-500">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
