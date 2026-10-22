"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, BackgroundVariant, MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { supabase } from "@/lib/supabase";
import { GitFork, Loader2, BookOpen, Info, ArrowRight, RefreshCw, Check } from "lucide-react";

type TafsirOption = { id: string; source: string | null; content: string };
type SelectedNodeInfo = { 
  id: string;
  label: string; 
  type: string; 
  deskripsi?: string;
  incoming: { sourceLabel: string; relation: string }[];
  outgoing: { targetLabel: string; relation: string }[];
};

const NODE_COLORS: Record<string, string> = {
  "Tafsir":      "#3b82f6", // Biru
  "Ayat":        "#3b82f6", // Biru
  "Topik Sains": "#a855f7", // Ungu
  "Topik":       "#a855f7",
  "Konsep":      "#10b981", // Hijau Emerald
  "Proses":      "#06b6d4", // Cyan
  "Fenomena":    "#f59e0b", // Amber
};

const EDGE_COLORS: Record<string, string> = {
  ":MEMBAHAS_TOPIK": "#a855f7",
  "MEMBAHAS_TOPIK":  "#a855f7",
  ":MENYEBUTKAN":    "#3b82f6",
  "MENYEBUTKAN":     "#3b82f6",
  ":BERLANJUT_KE":   "#06b6d4",
  "BERLANJUT_KE":    "#06b6d4",
  ":MENYEBABKAN":    "#f59e0b",
  "MENYEBABKAN":     "#f59e0b",
};

function getNodeColor(type: string | null) {
  if (!type) return "#10b981";
  for (const [key, color] of Object.entries(NODE_COLORS)) {
    if (type.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "#10b981";
}

function getEdgeColor(rel: string | null) {
  if (!rel) return "#10b981";
  return EDGE_COLORS[rel] || "#9ca3af";
}

function KnowledgeGraphContent() {
  const searchParams = useSearchParams();
  const [tafsirList, setTafsirList] = useState<TafsirOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [tafsirContent, setTafsirContent] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);

  useEffect(() => {
    supabase.from("tafsir").select("id, source, content").order("created_at", { ascending: false })
      .then(({ data }) => {
        setTafsirList(data ?? []);
        const paramId = searchParams.get("tafsir");
        if (paramId) setSelectedId(paramId);
        else if (data && data.length > 0) setSelectedId(data[0].id);
      });
  }, [searchParams]);

  const loadGraph = useCallback(async (tafsirId: string) => {
    if (!tafsirId) return;
    setLoading(true);
    setSelectedNode(null);

    const [{ data: tafsirData }, { data: nodesData }, { data: edgesData }] = await Promise.all([
      supabase.from("tafsir").select("*, topics(name)").eq("id", tafsirId).single(),
      supabase.from("nodes").select("*").eq("tafsir_id", tafsirId),
      supabase.from("edges").select("*").eq("tafsir_id", tafsirId),
    ]);

    setTafsirContent(tafsirData?.content ?? "");
    setTopic((tafsirData as { topics?: { name: string } })?.topics?.name ?? "");

    const rawNodes = nodesData ?? [];
    const rawEdges = edgesData ?? [];

    // Pisahkan node berdasarkan peran ontologis
    const tafsirNode = rawNodes.find(n => (n.type || "").toLowerCase().includes("tafsir") || (n.type || "").toLowerCase().includes("ayat"));
    const topikNode = rawNodes.find(n => (n.type || "").toLowerCase().includes("topik"));
    const conceptNodes = rawNodes.filter(n => n.id !== tafsirNode?.id && n.id !== topikNode?.id);

    // Hitung alur urutan kausalitas antar konsep berdasarkan graf berarah
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    conceptNodes.forEach(c => {
      adj.set(c.id, []);
      inDegree.set(c.id, 0);
    });

    rawEdges.forEach(e => {
      if (adj.has(e.source_node_id) && inDegree.has(e.target_node_id)) {
        adj.get(e.source_node_id)!.push(e.target_node_id);
        inDegree.set(e.target_node_id, (inDegree.get(e.target_node_id) || 0) + 1);
      }
    });

    // Cari titik awal konsep (yang dihubungkan dari Tafsir via :MENYEBUTKAN atau in-degree terendah)
    let startConceptId: string | null = null;
    if (tafsirNode) {
      const edgeFromTafsir = rawEdges.find(e => e.source_node_id === tafsirNode.id && e.target_node_id !== topikNode?.id);
      if (edgeFromTafsir) startConceptId = edgeFromTafsir.target_node_id;
    }
    if (!startConceptId) {
      const zeroIn = conceptNodes.find(c => (inDegree.get(c.id) || 0) === 0);
      startConceptId = zeroIn ? zeroIn.id : (conceptNodes[0]?.id ?? null);
    }

    const orderedConcepts: typeof rawNodes = [];
    const visited = new Set<string>();

    if (startConceptId) {
      const queue = [startConceptId];
      visited.add(startConceptId);
      while (queue.length > 0) {
        const currId = queue.shift()!;
        const nodeObj = conceptNodes.find(c => c.id === currId);
        if (nodeObj) orderedConcepts.push(nodeObj);
        const neighbors = adj.get(currId) || [];
        for (const nxt of neighbors) {
          if (!visited.has(nxt)) {
            visited.add(nxt);
            queue.push(nxt);
          }
        }
      }
    }

    // Masukkan sisa konsep yang mungkin belum terkunjungi
    conceptNodes.forEach(c => {
      if (!visited.has(c.id)) {
        orderedConcepts.push(c);
        visited.add(c.id);
      }
    });

    // Tetapkan posisi koordinat ideal (Hierarki Kausalitas Vertikal Bersih)
    const positions = new Map<string, { x: number; y: number }>();
    if (tafsirNode) {
      positions.set(tafsirNode.id, { x: 330, y: 40 });
    }
    if (topikNode) {
      positions.set(topikNode.id, { x: 670, y: 40 });
    }
    orderedConcepts.forEach((c, idx) => {
      positions.set(c.id, {
        x: 330,
        y: 175 + idx * 125,
      });
    });

    // Cek apakah sudah ada node yang secara eksplisit bertipe "Objek Utama" dari backend
    const hasExplicitObjekUtama = conceptNodes.some(c =>
      (c.type || "").toLowerCase().includes("objek utama")
    );

    // Bentuk objek ReactFlow Nodes dengan styling modern & glow
    const rfNodes: Node[] = rawNodes.map((n) => {
      const isTafsir = (n.type || "").toLowerCase().includes("tafsir") || (n.type || "").toLowerCase().includes("ayat");
      const isTopik = (n.type || "").toLowerCase().includes("topik");
      const isObjekUtama = !isTafsir && !isTopik && (
        hasExplicitObjekUtama
          ? (n.type || "").toLowerCase().includes("objek utama")
          : n.id === startConceptId
      );
      const pos = positions.get(n.id) || { x: 330, y: 150 };

      let bgGradient = "linear-gradient(135deg, rgba(6, 78, 59, 0.95) 0%, rgba(4, 120, 87, 0.95) 100%)";
      let borderColor = "#34d399";
      let shadowGlow = "rgba(16, 185, 129, 0.35)";

      if (isTafsir) {
        bgGradient = "linear-gradient(135deg, rgba(30, 58, 138, 0.95) 0%, rgba(29, 78, 216, 0.95) 100%)";
        borderColor = "#60a5fa";
        shadowGlow = "rgba(59, 130, 246, 0.4)";
      } else if (isTopik) {
        bgGradient = "linear-gradient(135deg, rgba(88, 28, 135, 0.95) 0%, rgba(126, 34, 206, 0.95) 100%)";
        borderColor = "#c084fc";
        shadowGlow = "rgba(168, 85, 247, 0.4)";
      } else if (isObjekUtama) {
        bgGradient = "linear-gradient(135deg, rgba(120, 53, 15, 0.95) 0%, rgba(180, 83, 9, 0.95) 100%)";
        borderColor = "#fbbf24";
        shadowGlow = "rgba(245, 158, 11, 0.45)";
      }

      const nodeTypeLabel = isObjekUtama ? "Objek Utama" : (n.type ?? "Konsep");

      return {
        id: n.id,
        position: pos,
        data: { 
          label: `${n.label}\n[${nodeTypeLabel}]`,
          rawLabel: n.label,
          type: nodeTypeLabel,
          deskripsi: n.deskripsi || ""
        },
        style: {
          background: bgGradient,
          color: "#ffffff",
          border: `2px solid ${borderColor}`,
          borderRadius: "14px",
          padding: "12px 16px",
          fontSize: "12px",
          fontWeight: 700,
          boxShadow: `0 10px 25px -5px ${shadowGlow}, 0 0 1px 1px rgba(255,255,255,0.1)`,
          whiteSpace: "pre-wrap",
          textAlign: "center",
          minWidth: "160px",
          maxWidth: "200px",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
        },

      };
    });

    // Bentuk objek ReactFlow Edges dengan Arrow Markers & Smooth Step Curves
    const rfEdges: Edge[] = rawEdges.map(e => {
      const edgeColor = getEdgeColor(e.relation);
      return {
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        label: e.relation,
        animated: true,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
          width: 18,
          height: 18,
        },
        style: { stroke: edgeColor, strokeWidth: 2 },
        labelStyle: { fill: "#f3f4f6", fontSize: 11, fontWeight: 700 },
        labelBgStyle: { fill: "#030712", fillOpacity: 0.92, rx: 6, ry: 6 },
        labelBgPadding: [6, 4] as [number, number],
      };
    });

    setNodes(rfNodes);
    setEdges(rfEdges);
    setLoading(false);
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (selectedId) loadGraph(selectedId);
  }, [selectedId, loadGraph]);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    const nodeLabelMap = new Map(nodes.map(n => [n.id, n.data.rawLabel || n.data.label.split("\n")[0]]));
    
    const incoming = edges
      .filter(e => e.target === node.id)
      .map(e => ({
        sourceLabel: nodeLabelMap.get(e.source) || e.source,
        relation: String(e.label || "")
      }));

    const outgoing = edges
      .filter(e => e.source === node.id)
      .map(e => ({
        targetLabel: nodeLabelMap.get(e.target) || e.target,
        relation: String(e.label || "")
      }));

    let defaultDeskripsi = node.data.deskripsi;
    if (!defaultDeskripsi) {
      if (node.data.type === "Tafsir" || node.data.type === "Ayat") {
        defaultDeskripsi = tafsirContent || "Teks Tafsir Ilmi yang mengkaji fenomena alam dalam ayat terkait.";
      } else if (node.data.type === "Topik Sains") {
        defaultDeskripsi = `Disiplin ilmu sains (${node.data.rawLabel || topic}) yang mengkaji mekanisme alam dalam ayat terkait.`;
      } else {
        defaultDeskripsi = `Konsep fisik/ilmiah terverifikasi yang membentuk rantai kausalitas proses alam.`;
      }
    }

    setSelectedNode({
      id: node.id,
      label: node.data.rawLabel || node.data.label.split("\n")[0],
      type: node.data.type || "Konsep",
      deskripsi: defaultDeskripsi,
      incoming,
      outgoing
    });
  };

  const handleReprocess = async () => {
    if (!selectedId || reprocessing) return;
    setReprocessing(true);
    setSuccessMessage("");
    try {
      const res = await fetch(`http://localhost:8000/api/reprocess-tafsir/${selectedId}`, {
        method: "POST"
      });
      if (!res.ok) {
        throw new Error("Gagal mereproses tafsir.");
      }
      setSuccessMessage("Berhasil mereproses tafsir sesuai 3 aturan wajib sistem!");
      await loadGraph(selectedId);
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      alert("Gagal mereproses via AI. Pastikan backend aktif di port 8000.");
    } finally {
      setReprocessing(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
              <GitFork className="text-emerald-400" size={28} /> Knowledge Graph Tafsir Ilmi
            </h1>
            <p className="text-gray-400 text-sm">Visualisasi ontologi relasi sains terstruktur dari teks Tafsir Al-Qur&apos;an</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50 max-w-xs">
              {tafsirList.map(t => (
                <option key={t.id} value={t.id} className="bg-gray-900">
                  {t.source ?? t.content.slice(0, 50) + "..."}
                </option>
              ))}
            </select>
            <button
              onClick={handleReprocess}
              disabled={reprocessing || !selectedId}
              title="Perbarui graf ayat ini dengan AI menggunakan 3 aturan wajib terbaru"
              className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
            >
              <RefreshCw size={14} className={reprocessing ? "animate-spin" : ""} />
              {reprocessing ? "Memproses AI..." : "Reproses AI"}
            </button>
          </div>
        </div>

        {/* Notifikasi Sukses */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs animate-in fade-in">
            <Check size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Legend bar */}
        <div className="mb-4 p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-bold text-slate-900 dark:text-gray-300">Tipe Node:</span>
            <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block shadow-sm"></span> 
              <span>Tafsir</span>
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <span className="w-3 h-3 rounded-full bg-purple-500 inline-block shadow-sm"></span> 
              <span>Topik Sains</span>
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block shadow-sm"></span> 
              <span>Objek Utama</span>
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-sm"></span> 
              <span>Konsep Proses</span>
            </span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-bold text-slate-900 dark:text-gray-300">4 Relasi Wajib:</span>
            <span className="px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-500/20 text-purple-900 dark:text-purple-300 border border-purple-400 dark:border-purple-500/30 font-bold font-mono text-[11px] shadow-xs">:MEMBAHAS_TOPIK</span>
            <span className="px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 border border-blue-400 dark:border-blue-500/30 font-bold font-mono text-[11px] shadow-xs">:MENYEBUTKAN</span>
            <span className="px-2.5 py-1 rounded-md bg-cyan-100 dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-300 border border-cyan-400 dark:border-cyan-500/30 font-bold font-mono text-[11px] shadow-xs">:BERLANJUT_KE</span>
            <span className="px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-400 dark:border-amber-500/30 font-bold font-mono text-[11px] shadow-xs">:MENYEBABKAN</span>
          </div>
        </div>

        {topic && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-gray-300">Kategori Sains Utama:</span>
            <span className="text-xs px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-900 dark:text-purple-300 border border-purple-400 dark:border-purple-500/40 font-bold shadow-xs">{topic}</span>
          </div>
        )}



        {/* Graph Canvas */}
        <div className="rounded-2xl overflow-hidden border border-white/10 mb-6 relative bg-gray-950 shadow-md" style={{ height: 520 }}>
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-500 gap-2">
              <Loader2 size={18} className="animate-spin text-emerald-500" /> Memuat Knowledge Graph...
            </div>
          ) : (
            <>
              <ReactFlow
                nodes={nodes} edges={edges}
                onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                fitView
              >
                <Background variant={BackgroundVariant.Dots} color="#10b981" gap={20} size={1} />
                <Controls className="!bg-white !border-gray-200 dark:!bg-gray-900 dark:!border-white/10" />
                <MiniMap className="!bg-white !border-gray-200 dark:!bg-gray-900 dark:!border-white/10" nodeColor={n => n.style?.background as string ?? "#10b981"} />
              </ReactFlow>


              {/* Node Detail Popup Drawer on click */}
              {selectedNode && (
                <div className="absolute top-4 right-4 max-w-sm w-full p-5 rounded-2xl bg-gray-900/95 backdrop-blur-xl border border-white/15 shadow-2xl text-white z-10 animate-in fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                      {selectedNode.type}
                    </span>
                    <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      ✕ Tutup
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 leading-snug">{selectedNode.label}</h3>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-300 leading-relaxed max-h-40 overflow-y-auto mb-3">
                    <p className="text-[10px] text-gray-400 font-semibold mb-1 uppercase tracking-wider">Penjelasan Entitas:</p>
                    {selectedNode.deskripsi}
                  </div>

                  {(selectedNode.incoming.length > 0 || selectedNode.outgoing.length > 0) && (
                    <div className="space-y-1.5 border-t border-white/10 pt-3 text-xs">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Alur Kausalitas Ilmiah:</p>
                      {selectedNode.incoming.map((inc, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-gray-300 bg-white/5 px-2.5 py-1.5 rounded-lg text-[11px]">
                          <span className="text-blue-400 font-medium truncate max-w-[90px]">{inc.sourceLabel}</span>
                          <span className="text-gray-500">→</span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px]">{inc.relation}</span>
                          <span className="text-gray-500">→</span>
                          <span className="text-emerald-400 font-medium truncate">Node Ini</span>
                        </div>
                      ))}
                      {selectedNode.outgoing.map((outg, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-gray-300 bg-white/5 px-2.5 py-1.5 rounded-lg text-[11px]">
                          <span className="text-emerald-400 font-medium">Node Ini</span>
                          <span className="text-gray-500">→</span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]">{outg.relation}</span>
                          <span className="text-gray-500">→</span>
                          <span className="text-teal-400 font-medium truncate max-w-[90px]">{outg.targetLabel}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Tafsir text */}
        {tafsirContent && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Ayat & Terjemahan */}
            <div className="p-6 rounded-2xl bg-white/3 border border-white/8 shadow-sm">
              <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-6 flex items-center gap-2">
                <BookOpen size={20} /> Detail Ayat & Tafsir
              </h2>
              
              <div className="space-y-6">
                {tafsirContent.includes("Teks Arab:") ? (
                  <>
                    <div className="p-4 rounded-xl bg-gray-950 border border-white/5 shadow-xs">
                      <p className="text-xs text-slate-700 dark:text-gray-400 mb-3 font-bold uppercase tracking-wider">Teks Arab</p>
                      <p className="text-2xl text-slate-900 dark:text-white text-right leading-relaxed font-arabic" dir="rtl">
                        {tafsirContent.split("Teks Arab:")[1]?.split("Terjemahan")[0]?.trim()}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/10 shadow-xs">
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-2 font-bold uppercase tracking-wider">Terjemahan / Tafsir</p>
                      <p className="text-sm text-slate-800 dark:text-gray-300 leading-relaxed font-medium">
                        {tafsirContent.split("Terjemahan")[1] 
                          ? "Terjemahan" + tafsirContent.split("Terjemahan")[1] 
                          : tafsirContent}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="p-4 rounded-xl bg-gray-950 border border-white/5 shadow-xs">
                    <p className="text-sm text-slate-800 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">{tafsirContent}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Statistik & Insight */}
            <div className="p-6 rounded-2xl bg-emerald-50/50 dark:bg-gradient-to-br dark:from-emerald-900/20 dark:to-teal-900/10 border border-emerald-200 dark:border-emerald-500/20 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Statistik Graph</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-center shadow-xs">
                  <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mb-1">{nodes.length}</div>
                  <div className="text-xs font-bold text-slate-700 dark:text-gray-400">Total Node (Entitas)</div>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-center shadow-xs">
                  <div className="text-3xl font-extrabold text-teal-600 dark:text-teal-400 mb-1">{edges.length}</div>
                  <div className="text-xs font-bold text-slate-700 dark:text-gray-400">Total Relasi (Edge)</div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-2 text-xs text-slate-800 dark:text-gray-300 font-medium shadow-xs">
                <p className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Info size={14} /> Aturan Graph Sistem
                </p>
                <p>1. <strong>Topik Sains</strong>: 1 kategori utama ({topic || "Terklasifikasi"}).</p>
                <p>2. <strong>Rantai Konsep &amp; Objek Utama</strong>: Tahapan proses sains diurutkan secara kronologis (hulu ke hilir), di mana objek inti tafsir (seperti Besi, Massa Air Laut, Air Hujan) ditandai sebagai <strong>Objek Utama</strong> pada posisi proses alaminya.</p>
                <p>3. <strong>4 Relasi Wajib</strong>: :MEMBAHAS_TOPIK, :MENYEBUTKAN, :BERLANJUT_KE, dan :MENYEBABKAN.</p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default function VisualisasiPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-500"><Loader2 className="animate-spin mr-2" size={16} /> Memuat...</div>}>
      <KnowledgeGraphContent />
    </Suspense>
  );
}

