"use client";
import { useEffect, useState } from "react";
import { supabase, type Tafsir, type Topic } from "@/lib/supabase";
import Link from "next/link";
import { GitFork, Clock, BookOpen, Filter } from "lucide-react";

const TOPIC_COLORS: Record<string, string> = {
  "Meteorologi": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Hidrologi": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "Geologi": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "Botani": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "Kimia": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "Astronomi": "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  "Oseanografi": "bg-teal-500/15 text-teal-400 border-teal-500/30",
  "Kosmologi": "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
  "Embriologi": "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

function getTopicColor(name: string) {
  return TOPIC_COLORS[name] ?? "bg-gray-500/15 text-gray-400 border-gray-500/30";
}

export default function DashboardPage() {
  const [tafsirList, setTafsirList] = useState<Tafsir[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: topicData } = await supabase.from("topics").select("*").order("name");
      setTopics(topicData ?? []);

      const { data: tafsirData } = await supabase
        .from("tafsir")
        .select("*, topics(id, name, description, created_at)")
        .order("created_at", { ascending: false });
      setTafsirList(tafsirData ?? []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const filtered = selectedTopic === "all"
    ? tafsirList
    : tafsirList.filter(t => t.topics?.name === selectedTopic);

  return (
    <div className="min-h-screen px-6 py-12 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Dashboard Repositori</h1>
          <p className="text-gray-400">Semua ayat fenomena alam yang telah diproses dan diklasifikasikan oleh AI</p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Tafsir", value: tafsirList.length },
            { label: "Topik Terdeteksi", value: topics.length },
            { label: "Tampil Saat Ini", value: filtered.length },
            { label: "Sumber Data", value: "Kemenag RI" },
          ].map(({ label, value }) => (
            <div key={label} className="p-4 rounded-xl bg-white/3 border border-white/8 shadow-sm">
              <div className="text-2xl font-bold text-emerald-500">{value}</div>
              <div className="text-xs text-gray-500 mt-1 font-medium">{label}</div>
            </div>
          ))}
        </div>

        {/* Filter by topic */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter size={14} className="text-gray-500" />
          <button
            onClick={() => setSelectedTopic("all")}
            className={`px-3 py-1 rounded-full text-sm border transition-all cursor-pointer ${
              selectedTopic === "all"
                ? "bg-emerald-500 text-white border-emerald-500 font-medium shadow-sm"
                : "text-gray-400 border-white/10 hover:border-emerald-500/40"
            }`}>
            Semua
          </button>
          {topics.map(t => (
            <button key={t.id} onClick={() => setSelectedTopic(t.name)}
              className={`px-3 py-1 rounded-full text-sm border transition-all cursor-pointer ${
                selectedTopic === t.name
                  ? "bg-emerald-500 text-white border-emerald-500 font-medium shadow-sm"
                  : "text-gray-400 border-white/10 hover:border-emerald-500/40"
              }`}>
              {t.name}
            </button>
          ))}
        </div>


        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">Memuat data...</div>
        ) : (
          <div className="grid gap-4">
            {filtered.map(tafsir => (
              <Link href={`/visualisasi?tafsir=${tafsir.id}`} key={tafsir.id} className="block p-5 rounded-xl bg-white/3 border border-white/8 hover:border-emerald-500/50 hover:bg-white/5 transition-all group cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {tafsir.topics && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getTopicColor(tafsir.topics.name)}`}>
                          {tafsir.topics.name}
                        </span>
                      )}
                      {tafsir.source && (
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          <BookOpen size={10} /> {tafsir.source}
                        </span>
                      )}
                    </div>
                    {/* Hapus line-clamp agar bisa terbaca lebih banyak, atau biarkan jika ingin rapi */}
                    <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed">
                      {tafsir.content}
                    </p>
                    <div className="flex items-center gap-1 mt-3 text-xs text-gray-500">
                      <Clock size={12} />
                      {new Date(tafsir.created_at).toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" })}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all">
                    <GitFork size={12} /> Lihat Graf & Detail
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
