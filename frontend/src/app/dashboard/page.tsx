"use client";
import { useEffect, useState } from "react";
import { supabase, type Tafsir, type Topic } from "@/lib/supabase";
import Link from "next/link";
import { GitFork, Clock, BookOpen, Filter } from "lucide-react";

const TOPIC_COLORS: Record<string, string> = {
  "Meteorologi": "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
  "Hidrologi": "bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/30",
  "Geologi": "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  "Botani": "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  "Kimia": "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30",
  "Astronomi": "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30",
  "Oseanografi": "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-500/15 dark:text-teal-400 dark:border-teal-500/30",
  "Kosmologi": "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-500/15 dark:text-fuchsia-400 dark:border-fuchsia-500/30",
  "Embriologi": "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30",
};

function getTopicColor(name: string) {
  return TOPIC_COLORS[name] ?? "bg-slate-100 text-slate-800 border-slate-200 dark:bg-gray-500/15 dark:text-gray-400 dark:border-gray-500/30";
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
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 px-6 py-12 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
            Dashboard Repositori
          </h1>
          <p className="text-slate-600 dark:text-gray-400">
            Semua ayat fenomena alam yang telah diproses dan diklasifikasikan oleh AI
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Tafsir", value: tafsirList.length },
            { label: "Topik Terdeteksi", value: topics.length },
            { label: "Tampil Saat Ini", value: filtered.length },
            { label: "Sumber Data", value: "Kemenag RI" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs dark:bg-white/3 dark:border-white/8 dark:shadow-none"
            >
              <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">{value}</div>
              <div className="text-xs text-slate-500 dark:text-gray-500 mt-1 font-medium">{label}</div>
            </div>
          ))}
        </div>

        {/* Filter by topic */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter size={15} className="text-slate-500 dark:text-gray-400" />
          <button
            onClick={() => setSelectedTopic("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              selectedTopic === "all"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40"
                : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 dark:bg-transparent dark:text-gray-400 dark:border-white/10 dark:hover:border-white/20"
            }`}
          >
            Semua
          </button>
          {topics.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTopic(t.name)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                selectedTopic === t.name
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40"
                  : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 dark:bg-transparent dark:text-gray-400 dark:border-white/10 dark:hover:border-white/20"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 dark:text-gray-500 font-medium">
            Memuat data...
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map(tafsir => (
              <Link
                href={`/visualisasi?tafsir=${tafsir.id}`}
                key={tafsir.id}
                className="block p-5 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-400 hover:shadow-md transition-all group cursor-pointer dark:bg-white/3 dark:border-white/8 dark:hover:border-emerald-500/50 dark:hover:bg-white/5 dark:shadow-none"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {tafsir.topics && (
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${getTopicColor(tafsir.topics.name)}`}>
                          {tafsir.topics.name}
                        </span>
                      )}
                      {tafsir.source && (
                        <span className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1 font-medium">
                          <BookOpen size={11} /> {tafsir.source}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-gray-300 line-clamp-3 leading-relaxed font-normal">
                      {tafsir.content}
                    </p>
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 dark:text-gray-500 font-medium">
                      <Clock size={12} />
                      {new Date(tafsir.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold group-hover:bg-emerald-600 group-hover:text-white transition-all dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:group-hover:bg-emerald-500/20">
                    <GitFork size={13} /> Lihat Graf &amp; Detail
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
