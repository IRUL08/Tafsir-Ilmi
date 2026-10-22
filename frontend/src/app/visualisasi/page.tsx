"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, BackgroundVariant, MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { supabase } from "@/lib/supabase";
import { GitFork, Loader2, BookOpen, Info, RefreshCw, Check } from "lucide-react";

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
  "Tafsir":      "#2563eb", // Blue
  "Ayat":        "#2563eb", // Blue
  "Topik Sains": "#7c3aed", // Purple
  "Topik":       "#7c3aed",
  "Konsep":      "#059669", // Emerald
  "Proses":      "#0891b2", // Cyan
  "Fenomena":    "#d97706", // Amber
};

const EDGE_COLORS: Record<string, string> = {
  ":MEMBAHAS_TOPIK": "#7c3aed",
  "MEMBAHAS_TOPIK":  "#7c3aed",
  ":MENYEBUTKAN":    "#2563eb",
  "MENYEBUTKAN":     "#2563eb",
  ":BERLANJUT_KE":   "#0891b2",
  "BERLANJUT_KE":    "#0891b2",
  ":MENYEBABKAN":    "#d97706",
  "MENYEBABKAN":     "#d97706",
};

function getNodeColor(type: string | null) {
  if (!type) return "#059669";
  for (const [key, color] of Object.entries(NODE_COLORS)) {
    if (type.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "#059669";
}

function getEdgeColor(rel: string | null) {
  if (!rel) return "#059669";
  return EDGE_COLORS[rel] || "#64748b";
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

    // Hitung derajat masuk & keluar untuk menyusun rantai kausalitas
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    const conceptAdjacency = new Map<string, string[]>();

    conceptNodes.forEach(n => {
      inDegree.set(n.id, 0);
      outDegree.set(n.id, 0);
      conceptAdjacency.set(n.id, []);
    });

    rawEdges.forEach(e => {
      if (inDegree.has(e.target_node_id)) {
        inDegree.set(e.target_node_id, (inDegree.get(e.target_node_id) || 0) + 1);
      }
      if (outDegree.has(e.source_node_id)) {
        outDegree.set(e.source_node_id, (outDegree.get(e.source_node_id) || 0) + 1);
      }
      if (conceptAdjacency.has(e.source_node_id) && conceptAdjacency.has(e.target_node_id)) {
        conceptAdjacency.get(e.source_node_id)?.push(e.target_node_id);
      }
    });

    // Cari node hulu (akar proses kausalitas)
    let startConceptId = conceptNodes[0]?.id;
    for (const c of conceptNodes) {
      if ((inDegree.get(c.id) || 0) === 0 && (outDegree.get(c.id) || 0) > 0) {
        startConceptId = c.id;
        break;
      }
    }

    // Urutkan tahapan konsep secara topologis / traversal
    const orderedConceptIds: string[] = [];
    const visited = new Set<string>();
    
    if (startConceptId) {
      const queue = [startConceptId];
      visited.add(startConceptId);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        orderedConceptIds.push(curr);
        for (const neighbor of (conceptAdjacency.get(curr) || [])) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
    }

    // Masukkan sisa node konsep jika belum masuk
    conceptNodes.forEach(c => {
      if (!visited.has(c.id)) {
        orderedConceptIds.push(c.id);
        visited.add(c.id);
      }
    });

    // Tentukan koordinat layout graf yang rapi dan konsisten
    const positions = new Map<string, { x: number; y: number }>();
    const BASE_X = 260;
    let currentY = 40;

    // 1. Tafsir Node di baris paling atas
    if (tafsirNode) {
      positions.set(tafsirNode.id, { x: BASE_X, y: currentY });
    }

    // 2. Topik Sains Node di samping kanan Tafsir Node
    if (topikNode) {
      positions.set(topikNode.id, { x: BASE_X + 260, y: currentY });
    }

    currentY += 140;

    // 3. Rantai Konsep & Objek Utama mengalir ke bawah
    orderedConceptIds.forEach((id) => {
      positions.set(id, { x: BASE_X, y: currentY });
      currentY += 120;
    });

    const hasExplicitObjekUtama = conceptNodes.some(c =>
      (c.type || "").toLowerCase().includes("objek utama")
    );

    // Bentuk objek ReactFlow Nodes dengan styling modern & jewel tones
    const rfNodes: Node[] = rawNodes.map((n) => {
      const isTafsir = (n.type || "").toLowerCase().includes("tafsir") || (n.type || "").toLowerCase().includes("ayat");
      const isTopik = (n.type || "").toLowerCase().includes("topik");
      const isObjekUtama = !isTafsir && !isTopik && (
        hasExplicitObjekUtama
          ? (n.type || "").toLowerCase().includes("objek utama")
          : n.id === startConceptId
      );
      const pos = positions.get(n.id) || { x: 260, y: 150 };

      // Palet warna node yang tajam dan mewah baik di Light maupun Dark mode
      let bgGradient = "linear-gradient(135deg, #047857 0%, #059669 100%)";
      let borderColor = "#34d399";
      let shadowGlow = "rgba(5, 150, 105, 0.35)";

      if (isTafsir) {
        bgGradient = "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)";
        borderColor = "#60a5fa";
        shadowGlow = "rgba(37, 99, 235, 0.35)";
      } else if (isTopik) {
        bgGradient = "linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)";
        borderColor = "#c084fc";
        shadowGlow = "rgba(124, 58, 237, 0.35)";
      } else if (isObjekUtama) {
        bgGradient = "linear-gradient(135deg, #b45309 0%, #d97706 100%)";
        borderColor = "#fbbf24";
        shadowGlow = "rgba(217, 119, 6, 0.4)";
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
          boxShadow: `0 8px 20px -3px ${shadowGlow}, 0 2px 4px rgba(0,0,0,0.1)`,
          whiteSpace: "pre-wrap",
          textAlign: "center",
          minWidth: "160px",
          maxWidth: "200px",
          cursor: "pointer",
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
        style: { stroke: edgeColor, strokeWidth: 2.5 },
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
    const rawEdges = edges;
    const rawNodes = nodes;

    const incoming = rawEdges
      .filter(e => e.target === node.id)
      .map(e => {
        const srcNode = rawNodes.find(n => n.id === e.source);
        return {
          sourceLabel: srcNode?.data.rawLabel || srcNode?.data.label.split("\n")[0] || e.source,
          relation: String(e.label || "")
        };
      });

    const outgoing = rawEdges
      .filter(e => e.source === node.id)
      .map(e => {
        const tgtNode = rawNodes.find(n => n.id === e.target);
        return {
          targetLabel: tgtNode?.data.rawLabel || tgtNode?.data.label.split("\n")[0] || e.target,
          relation: String(e.label || "")
        };
      });

    let defaultDeskripsi = node.data.deskripsi;
    if (!defaultDeskripsi) {
      if (node.data.type === "Tafsir" || node.data.type === "Ayat") {
        defaultDeskripsi = `Entitas jangkar utama teks Tafsir Al-Qur'an.`;
      } else if (node.data.type === "Topik Sains" || node.data.type === "Topik") {
        defaultDeskripsi = `Disiplin ilmu sains utama (${topic || "Sains"}) yang mengkaji fenomena ini.`;
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
      setSuccessMessage("Berhasil mereproses tafsir sesuai aturan wajib sistem!");
      await loadGraph(selectedId);
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      alert("Gagal mereproses via AI. Pastikan backend aktif di port 8000.");
    } finally {
      setReprocessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 px-6 py-12 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-2.5 tracking-tight">
              <GitFork className="text-emerald-600 dark:text-emerald-400" size={28} /> Knowledge Graph Tafsir Ilmi
            </h1>
            <p className="text-slate-600 dark:text-gray-400 text-sm">
              Visualisasi ontologi relasi sains terstruktur dari teks Tafsir Al-Qur&apos;an
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-xs max-w-xs dark:bg-white/5 dark:border-white/10 dark:text-white dark:focus:border-emerald-500/50"
            >
              {tafsirList.map(t => (
                <option key={t.id} value={t.id} className="bg-white text-slate-900 dark:bg-gray-900 dark:text-white">
                  {t.source ?? t.content.slice(0, 50) + "..."}
                </option>
              ))}
            </select>
            <button
              onClick={handleReprocess}
              disabled={reprocessing || !selectedId}
              title="Perbarui graf ayat ini dengan AI menggunakan aturan wajib terbaru"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-400 dark:border dark:border-emerald-500/30 dark:shadow-none"
            >
              <RefreshCw size={14} className={reprocessing ? "animate-spin" : ""} />
              {reprocessing ? "Memproses AI..." : "Reproses AI"}
            </button>
          </div>
        </div>

        {/* Notifikasi Sukses */}
        {successMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center gap-2 text-emerald-800 text-xs font-semibold shadow-xs animate-in fade-in dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300">
            <Check size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Legend bar */}
        <div className="mb-4 p-3.5 rounded-xl bg-white border border-slate-200/90 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs dark:bg-white/5 dark:border-white/10 dark:shadow-none">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-bold text-slate-900 dark:text-gray-300">Tipe Node:</span>
            <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block shadow-xs"></span> 
              <span>Tafsir</span>
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white">
              <span className="w-3 h-3 rounded-full bg-purple-600 inline-block shadow-xs"></span> 
              <span>Topik Sains</span>
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-xs"></span> 
              <span>Objek Utama</span>
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white">
              <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block shadow-xs"></span> 
              <span>Konsep Proses</span>
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 dark:text-gray-300">4 Relasi Wajib:</span>
            <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-bold font-mono text-[11px] shadow-xs dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30">:MEMBAHAS_TOPIK</span>
            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-bold font-mono text-[11px] shadow-xs dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30">:MENYEBUTKAN</span>
            <span className="px-2.5 py-1 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200 font-bold font-mono text-[11px] shadow-xs dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30">:BERLANJUT_KE</span>
            <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold font-mono text-[11px] shadow-xs dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">:MENYEBABKAN</span>
          </div>
        </div>

        {topic && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-gray-300">Kategori Sains Utama:</span>
            <span className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 font-bold shadow-xs dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40">{topic}</span>
          </div>
        )}

        {/* Graph Canvas */}
        <div className="rounded-2xl overflow-hidden border border-slate-200/90 mb-6 relative bg-white shadow-sm dark:bg-gray-950 dark:border-white/10 dark:shadow-md" style={{ height: 520 }}>
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-500 dark:text-gray-500 gap-2 font-medium">
              <Loader2 size={18} className="animate-spin text-emerald-600 dark:text-emerald-400" /> Memuat Knowledge Graph...
            </div>
          ) : (
            <>
              <ReactFlow
                nodes={nodes} edges={edges}
                onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                fitView
              >
                <Background variant={BackgroundVariant.Dots} color="#94a3b8" gap={20} size={1} />
                <Controls className="!bg-white !border-slate-200 !text-slate-800 dark:!bg-gray-900 dark:!border-white/10 dark:!text-white" />
                <MiniMap className="!bg-white !border-slate-200 dark:!bg-gray-900 dark:!border-white/10" nodeColor={n => n.style?.background as string ?? "#059669"} />
              </ReactFlow>

              {/* Node Detail Popup Drawer on click */}
              {selectedNode && (
                <div className="absolute top-4 right-4 max-w-sm w-full p-5 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl text-slate-900 z-10 animate-in fade-in dark:bg-gray-900/95 dark:border-white/15 dark:text-white dark:shadow-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                      {selectedNode.type}
                    </span>
                    <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-slate-900 text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer dark:text-gray-400 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10">
                      ✕ Tutup
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 leading-snug">{selectedNode.label}</h3>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed max-h-40 overflow-y-auto mb-3 dark:bg-white/5 dark:border-white/5 dark:text-gray-300">
                    <p className="text-[10px] text-slate-500 dark:text-gray-400 font-bold mb-1 uppercase tracking-wider">Penjelasan Entitas:</p>
                    {selectedNode.deskripsi}
                  </div>

                  {(selectedNode.incoming.length > 0 || selectedNode.outgoing.length > 0) && (
                    <div className="space-y-1.5 border-t border-slate-200 dark:border-white/10 pt-3 text-xs">
                      <p className="text-[10px] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Alur Kausalitas Ilmiah:</p>
                      {selectedNode.incoming.map((inc, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-slate-800 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-lg text-[11px] dark:text-gray-300 dark:bg-white/5 dark:border-transparent">
                          <span className="text-blue-700 dark:text-blue-400 font-semibold truncate max-w-[90px]">{inc.sourceLabel}</span>
                          <span className="text-slate-400 dark:text-gray-500">→</span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[10px] font-bold dark:bg-blue-500/20 dark:text-blue-300 dark:border-transparent">{inc.relation}</span>
                          <span className="text-slate-400 dark:text-gray-500">→</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold truncate">Node Ini</span>
                        </div>
                      ))}
                      {selectedNode.outgoing.map((outg, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-slate-800 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-lg text-[11px] dark:text-gray-300 dark:bg-white/5 dark:border-transparent">
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Node Ini</span>
                          <span className="text-slate-400 dark:text-gray-500">→</span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-bold dark:bg-amber-500/20 dark:text-amber-300 dark:border-transparent">{outg.relation}</span>
                          <span className="text-slate-400 dark:text-gray-500">→</span>
                          <span className="text-teal-700 dark:text-teal-400 font-semibold truncate max-w-[90px]">{outg.targetLabel}</span>
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
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs dark:bg-white/3 dark:border-white/8 dark:shadow-none">
              <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mb-6 flex items-center gap-2">
                <BookOpen size={20} /> Detail Ayat &amp; Tafsir
              </h2>
              
              <div className="space-y-6">
                {tafsirContent.includes("Teks Arab:") ? (
                  <>
                    <div className="p-5 rounded-xl bg-amber-50/40 border border-amber-200/60 shadow-xs dark:bg-gray-950 dark:border-white/5">
                      <p className="text-xs text-amber-800 dark:text-gray-400 mb-3 font-bold uppercase tracking-wider">Teks Arab</p>
                      <p className="text-2xl text-slate-900 dark:text-white text-right leading-relaxed font-serif" dir="rtl">
                        {tafsirContent.split("Teks Arab:")[1]?.split("Terjemahan")[0]?.trim()}
                      </p>
                    </div>
                    <div className="p-5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 shadow-xs dark:bg-emerald-950/20 dark:border-emerald-500/10">
                      <p className="text-xs text-emerald-800 dark:text-emerald-400 mb-2 font-bold uppercase tracking-wider">Terjemahan / Tafsir</p>
                      <p className="text-sm text-slate-800 dark:text-gray-300 leading-relaxed font-normal">
                        {tafsirContent.split("Terjemahan")[1] 
                          ? "Terjemahan" + tafsirContent.split("Terjemahan")[1] 
                          : tafsirContent}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs dark:bg-gray-950 dark:border-white/5">
                    <p className="text-sm text-slate-800 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-normal">{tafsirContent}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Statistik & Insight */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-teal-50/30 to-white border border-emerald-200/80 shadow-xs dark:bg-gradient-to-br dark:from-emerald-900/20 dark:to-teal-900/10 dark:border-emerald-500/20 dark:shadow-none">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Statistik Graph</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-white border border-emerald-200/80 text-center shadow-xs dark:bg-white/5 dark:border-white/5">
                  <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 mb-1">{nodes.length}</div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-gray-400">Total Node (Entitas)</div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-teal-200/80 text-center shadow-xs dark:bg-white/5 dark:border-white/5">
                  <div className="text-3xl font-extrabold text-teal-700 dark:text-teal-400 mb-1">{edges.length}</div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-gray-400">Total Relasi (Edge)</div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white border border-emerald-200/80 space-y-2 text-xs text-slate-700 shadow-xs dark:bg-white/5 dark:border-white/5 dark:text-gray-300">
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
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-500 dark:text-gray-500 font-medium"><Loader2 className="animate-spin mr-2" size={16} /> Memuat...</div>}>
      <KnowledgeGraphContent />
    </Suspense>
  );
}
