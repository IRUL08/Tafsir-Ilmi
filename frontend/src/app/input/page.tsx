"use client";
import { useState } from "react";
import { Send, Loader2, CheckCircle, AlertCircle, Sparkles, BookOpen, BookmarkCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

type VerseInfo = {
  surah_number?: number;
  surah_name?: string;
  ayah_number?: number;
  label?: string;
  reason?: string;
  arabic?: string;
  latin?: string;
  terjemahan?: string;
};

type ProcessResult = {
  message: string;
  data: { topic: string; nodes_saved: number; edges_saved: number; tafsir_id: string };
  main_object?: string;
  graph: { 
    topic: string; 
    main_object?: string;
    nodes: { label: string; type: string; deskripsi?: string }[]; 
    edges: { source_node: string; target_node: string; relation: string }[] 
  };
  verse_info?: VerseInfo | null;
};

export default function InputPage() {
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/api/process-tafsir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, source }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Gagal memproses tafsir");
      }
      const data = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 px-6 py-12 transition-colors duration-200">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-xs font-bold mb-3 shadow-xs">
            <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400" />
            Auto-Detection Ayat &amp; Ekstraksi Knowledge Graph
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-2 tracking-tight">
            Ekstraksi Teks Tafsir
          </h1>
          <p className="text-slate-600 dark:text-gray-400 text-sm leading-relaxed">
            Cukup <strong className="text-slate-900 dark:text-white font-semibold">masukkan teks tafsir saja</strong>. Sistem AI akan secara otomatis:
          </p>
          <div className="grid sm:grid-cols-3 gap-3 mt-4 text-xs">
            <div className="p-4 rounded-xl bg-white border border-emerald-200/80 shadow-xs dark:bg-white/5 dark:border-white/10 text-slate-700 dark:text-gray-300">
              <span className="text-emerald-700 dark:text-emerald-400 font-bold block mb-1 text-sm">1. Deteksi Ayat Otomatis</span>
              AI mengenali Surah &amp; nomor Ayat dari kandungan tafsir Anda.
            </div>
            <div className="p-4 rounded-xl bg-white border border-teal-200/80 shadow-xs dark:bg-white/5 dark:border-white/10 text-slate-700 dark:text-gray-300">
              <span className="text-teal-700 dark:text-teal-400 font-bold block mb-1 text-sm">2. Ambil dari Dataset</span>
              Mengambil teks Arab &amp; terjemahan resmi Kemenag RI dari database.
            </div>
            <div className="p-4 rounded-xl bg-white border border-cyan-200/80 shadow-xs dark:bg-white/5 dark:border-white/10 text-slate-700 dark:text-gray-300">
              <span className="text-cyan-700 dark:text-cyan-400 font-bold block mb-1 text-sm">3. Bentuk Knowledge Graph</span>
              Objek utama tafsir (Besi, Hujan, Janin, dll.) menjadi node konsep dengan 4 relasi valid.
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
              Sumber Tafsir <span className="text-slate-500 dark:text-gray-500 font-normal text-xs">(Opsional — otomatis dibuat jika kosong)</span>
            </label>
            <input
              type="text"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="Contoh: Tafsir Ilmi Kemenag RI, Tafsir Al-Mishbah (boleh dikosongkan)"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all text-sm dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-gray-600 dark:focus:border-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
              Teks Tafsir <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={8}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Tempel teks tafsir di sini. Anda HANYA perlu memasukkan penjelasan tafsirnya saja, AI akan mendeteksi surah dan ayat yang dibahas..."
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all resize-none text-sm leading-relaxed dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-gray-600 dark:focus:border-emerald-500/50"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !content.trim()}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-gray-950"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> 
                <span>Menganalisis Tafsir &amp; Mendeteksi Ayat Al-Qur&apos;an...</span>
              </>
            ) : (
              <>
                <Send size={18} /> 
                <span>Proses &amp; Ekstrak Knowledge Graph</span>
              </>
            )}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400">
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-bold text-sm">Gagal memproses</p>
              <p className="text-xs text-red-700 dark:text-red-400/80 mt-1">{error}</p>
              <p className="text-xs text-red-700 dark:text-red-400/80 mt-1">Pastikan backend sudah berjalan di <code>localhost:8000</code></p>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-8 p-6 rounded-2xl bg-white border border-emerald-200/80 shadow-md space-y-6 dark:bg-emerald-950/20 dark:border-emerald-500/30">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-base">
                <CheckCircle size={20} />
                {result.message}
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                Tersimpan di Supabase
              </span>
            </div>

            {/* HASIL DETEKSI AYAT AL-QUR'AN (HIGHLIGHTED) */}
            {result.verse_info && (
              <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white border border-emerald-200/80 space-y-4 shadow-sm dark:bg-gradient-to-br dark:from-emerald-900/30 dark:via-slate-900/60 dark:to-teal-900/20 dark:border-emerald-500/40 dark:shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="inline-flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-base">
                    <BookmarkCheck size={20} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Ayat Terdeteksi: {result.verse_info.label || `QS. ${result.verse_info.surah_name}: ${result.verse_info.ayah_number}`}</span>
                  </div>
                  {result.verse_info.surah_number && (
                    <span className="text-xs text-slate-600 dark:text-gray-400 px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-medium dark:bg-white/5 dark:border-white/10">
                      Surah ke-{result.verse_info.surah_number} · Ayat {result.verse_info.ayah_number}
                    </span>
                  )}
                </div>

                {/* Teks Arab dari Dataset */}
                {result.verse_info.arabic && (
                  <div className="p-5 rounded-xl bg-white border border-emerald-200/60 text-right font-serif text-2xl text-slate-900 leading-loose tracking-wide shadow-xs dark:bg-gray-950/70 dark:border-white/10 dark:text-emerald-100" dir="rtl">
                    {result.verse_info.arabic}
                  </div>
                )}

                {/* Transliterasi Latin */}
                {result.verse_info.latin && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400/90 italic font-mono leading-relaxed px-1 font-medium">
                    {result.verse_info.latin}
                  </p>
                )}

                {/* Terjemahan Resmi Kemenag */}
                {result.verse_info.terjemahan && (
                  <div className="p-4 rounded-xl bg-emerald-50/90 border border-emerald-200/80 dark:bg-emerald-950/40 dark:border-emerald-500/20">
                    <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <BookOpen size={13} /> Terjemahan Resmi Kemenag RI (dari dataset quran-json):
                    </div>
                    <p className="text-sm text-slate-800 dark:text-gray-200 leading-relaxed italic font-normal">
                      &ldquo;{result.verse_info.terjemahan}&rdquo;
                    </p>
                  </div>
                )}

                {/* Alasan Deteksi AI */}
                {result.verse_info.reason && (
                  <div className="text-xs text-slate-700 dark:text-gray-400 bg-white dark:bg-white/5 p-3 rounded-lg border border-slate-200 dark:border-white/5 leading-relaxed">
                    <strong className="text-emerald-700 dark:text-emerald-400 font-bold">Analisis Deteksi AI:</strong> {result.verse_info.reason}
                  </div>
                )}
              </div>
            )}

            {/* Statistik Knowledge Graph */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-white/5 text-center border border-purple-200 dark:border-white/5">
                <div className="text-lg font-bold text-purple-800 dark:text-purple-400 truncate">{result.graph.topic}</div>
                <div className="text-xs text-purple-700 dark:text-gray-400 mt-0.5 font-medium">Kategori Sains</div>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-center border border-amber-200 dark:border-amber-500/20">
                <div className="text-lg font-bold text-amber-800 dark:text-amber-300 truncate">{result.main_object || result.graph.main_object || "Konsep Inti"}</div>
                <div className="text-xs text-amber-700 dark:text-amber-400/80 mt-0.5 font-medium">Objek Utama Tafsir</div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-white/5 text-center border border-emerald-200 dark:border-white/5">
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{result.data.nodes_saved}</div>
                <div className="text-xs text-emerald-700 dark:text-gray-400 mt-0.5 font-medium">Node Entitas</div>
              </div>
              <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-white/5 text-center border border-teal-200 dark:border-white/5">
                <div className="text-lg font-bold text-teal-700 dark:text-teal-400">{result.data.edges_saved}</div>
                <div className="text-xs text-teal-700 dark:text-gray-400 mt-0.5 font-medium">Relasi Terverifikasi</div>
              </div>
            </div>

            {/* List of nodes */}
            <div className="space-y-2">
              <p className="text-xs text-slate-700 dark:text-gray-400 font-bold uppercase tracking-wider">
                Node Konsep yang Diekstrak ({result.graph.nodes.length}):
              </p>
              <div className="grid gap-2 max-h-60 overflow-y-auto pr-1">
                {result.graph.nodes.map((n, i) => {
                  const targetMain = (result.main_object || result.graph.main_object || "").toLowerCase();
                  const isMainObj = n.type === "Objek Utama" || (targetMain && (n.label.toLowerCase() === targetMain || n.label.toLowerCase().includes(targetMain)));
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border flex flex-col gap-1 text-xs transition-all ${
                        isMainObj
                          ? "bg-amber-50/80 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30"
                          : "bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-bold ${isMainObj ? "text-amber-800 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-400"}`}>
                          {n.label}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          isMainObj
                            ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                            : "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                        }`}>
                          {n.type}
                        </span>
                      </div>
                      {n.deskripsi && (
                        <p className="text-[11px] text-slate-600 dark:text-gray-400 italic leading-snug">
                          {n.deskripsi}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Link
                href={`/visualisasi?tafsir=${result.data.tafsir_id}`}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-gray-950"
              >
                Lihat Knowledge Graph Interaktif <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
