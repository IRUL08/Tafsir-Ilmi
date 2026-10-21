# -*- coding: utf-8 -*-
import json
import re
import time
from groq import Groq
from config import settings
from models import ExtractedKnowledge, Node, Edge, VerseIdentification, ALLOWED_RELATIONS, RELATION_SYNONYMS
from quran_service import get_verse_detail, find_surah_number_by_name, SURAH_NAMES

client = Groq(api_key=settings.GROQ_API_KEY)

# Kata-kata nama tempat / geografis yang dilarang menjadi node tersendiri
FORBIDDEN_CONCEPT_KEYWORDS = {
    "atlantik", "mediterania", "gibraltar", "mekah", "makkah", "mesir",
    "arab", "eropa", "asia", "afrika", "dua laut", "batas pemisah"
}

def clean_and_parse_json(raw_text: str) -> dict:
    """Bersihkan output LLM dan parse menjadi dictionary secara tangguh."""
    text = raw_text.strip()
    
    # 1. Coba parse langsung
    try:
        return json.loads(text)
    except Exception:
        pass

    # 2. Hapus markdown code fences ```json ... ``` di mana saja
    text_no_fence = re.sub(r"```(?:json)?", "", text)
    text_no_fence = text_no_fence.replace("```", "").strip()
    try:
        return json.loads(text_no_fence)
    except Exception:
        pass

    # 3. Ekstrak blok JSON terluar { ... }
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidate = text[first_brace:last_brace + 1]
        try:
            return json.loads(candidate)
        except Exception:
            # Hapus komentar //... atau /*...*/
            candidate_no_comments = re.sub(r"//.*?\n", "\n", candidate)
            # Hapus trailing commas seperti , } atau , ]
            candidate_no_trailing = re.sub(r",\s*([\}\]])", r"\1", candidate_no_comments)
            try:
                return json.loads(candidate_no_trailing)
            except Exception:
                pass

    # 4. Fallback dengan ast.literal_eval jika LLM mengeluarkan single quote Python dict
    import ast
    try:
        if first_brace != -1 and last_brace != -1:
            dict_candidate = text[first_brace:last_brace + 1]
            val = ast.literal_eval(dict_candidate)
            if isinstance(val, dict):
                return val
    except Exception:
        pass

    # Terakhir coba json.loads pada text bersih untuk error handling standar
    return json.loads(text)


def extract_knowledge_graph(text: str) -> ExtractedKnowledge:
    prompt = f"""
Anda adalah asisten AI pakar Knowledge Graph untuk Tafsir Al-Qur'an dan Sains (Tafsir Ilmi).
Pengguna HANYA memasukkan teks tafsir. Tugas Anda adalah membuat Knowledge Graph yang BERSIH, LOGIS SECARA KRONOLOGIS, TIDAK AMBIGU, dan IDEAL.

ATURAN EMAS KNOWLEDGE GRAPH IDEAL:
1. Identifikasi Ayat Al-Qur'an:
   - Analisis teks tafsir secara mendalam untuk menentukan firman Allah / ayat Al-Qur'an mana yang sedang dibahas.
   - Tentukan:
     * "surah_name": Nama resmi surah (contoh: "An-Nur", "Ar-Ra'd", "Ar-Rahman", "Al-Hadid", "An-Naml", dll.)
     * "surah_number": Nomor surah 1 - 114 (contoh: 24, 13, 55, 57, dll.)
     * "ayah_number": Nomor ayat spesifik yang dijelaskan (contoh: 19, 20, 25, 43, 12, dll.)
     * "reason": Penjelasan singkat mengapa tafsir ini merujuk ke ayat tersebut

2. Topik Sains & Objek Utama Tafsir:
   - Tentukan TEPAT 1 kategori sains utama (contoh: Meteorologi, Hidrologi, Geologi, Astronomi, Embriologi, Kosmologi, Botani, Oseanografi, Kimia).
   - Tentukan "main_object": Objek fisik/materi/entitas inti yang menjadi pokok bahasan ayat/tafsir (contoh: "Besi (Fe)", "Massa Air Laut", "Air Hujan", "Kilat", "Janin", "Gunung", "Matahari", dll.). Label wajib ringkas (1-3 kata).

3. Ekstrak 4 Node Rantai Ilmiah yang Kronologis & Tidak Ambigu:
   - 1 Node Tafsir: label "Tafsir QS. [NamaSurah]: [NomorAyat]", tipe "Tafsir".
   - 1 Node Topik Sains: label nama bidang sains 1-3 kata, tipe "Topik Sains".
   - TEPAT 4 Node Tahapan/Konsep Sains yang diurutkan secara KRONOLOGIS (dari Hulu/Sebab Awal -> Proses Fisik -> Hilir/Fenomena Akhir):
     * Tepat 1 node di antara 4 node tersebut yang merupakan "main_object" WAJIB diberi `"type": "Objek Utama"`.
     * 3 node lainnya dalam rantai proses diberi `"type": "Konsep"`.
     * POSISI "Objek Utama" HARUS SESUAI URUTAN ALUR ILMIAHNYA (JANGAN DIPAKSA DI AWAL JIKA IA ADALAH HASIL PROSES!):
       - Contoh 1 (QS. Al-Hadid: 25 tentang Besi):
         1. "Fusi Inti Bintang" (type: "Konsep") -> 2. "Besi (Fe)" (type: "Objek Utama") -> 3. "Ledakan Supernova" (type: "Konsep") -> 4. "Meteorit Besi" (type: "Konsep")
       - Contoh 2 (QS. Ar-Rahman: 19-20 tentang Dua Lautan / Haloklin & Piknoklin):
         1. "Massa Air Laut" (type: "Objek Utama") -> 2. "Perbedaan Kerapatan Air" (type: "Konsep") -> 3. "Gaya Tegangan Permukaan" (type: "Konsep") -> 4. "Haloklin dan Piknoklin" (type: "Konsep")
       - Contoh 3 (QS. An-Nur: 43 tentang Hujan):
         1. "Pergerakan Angin" (type: "Konsep") -> 2. "Awan Kumulonimbus" (type: "Konsep") -> 3. "Kondensasi Uap Air" (type: "Konsep") -> 4. "Air Hujan" (type: "Objek Utama")
       - Contoh 4 (QS. Ar-Ra'd: 12 tentang Kilat):
         1. "Awan Bermuatan Listrik" (type: "Konsep") -> 2. "Beda Potensial Listrik" (type: "Konsep") -> 3. "Kilat" (type: "Objek Utama") -> 4. "Guruh dan Hujan" (type: "Konsep")
     * LARANGAN KERAS AGAR TIDAK AMBIGU:
       - DILARANG membalik urutan sebab-akibat (misal menaruh "Haloklin" di awal lalu menyebabkan "Gaya Tegangan Permukaan" — yang benar adalah "Massa Air Laut" -> "Perbedaan Kerapatan Air" -> "Gaya Tegangan Permukaan" -> "Haloklin dan Piknoklin").
       - DILARANG memecah dua istilah sejajar menjadi hubungan sebab-akibat palsu (misal "Haloklin :MENYEBABKAN Piknoklin" — gabungkan istilah sejajar menjadi "Haloklin dan Piknoklin").
       - DILARANG menghilangkan benda inti tafsir (misal di tafsir besi wajib ada node "Besi (Fe)", di tafsir dua lautan wajib ada node "Massa Air Laut").
       - DILARANG membuat node nama tempat/geografis ("Atlantik", "Mediterania", "Gibraltar", "Mekah"). Masukkan nama tempat di 'deskripsi'.
       - Semua label node WAJIB 1 - 3 kata, dan 'deskripsi' WAJIB menjelaskan mekanisme ilmiahnya secara jelas sesuai teks tafsir.

4. Struktur Relasi Rantai Kausalitas Ilmiah (HANYA 4 Relasi):
   - :MEMBAHAS_TOPIK (Menghubungkan Tafsir -> Topik Sains)
   - :MENYEBUTKAN (Menghubungkan Tafsir -> Node Pertama dalam rantai ilmiah)
   - :MENYEBABKAN (Menghubungkan Tahap A -> Tahap B jika A secara fisik memicu/menghasilkan B)
   - :BERLANJUT_KE (Menghubungkan Tahap A -> Tahap B jika merupakan kelanjutan tahapan/kondisi proses)
   * Rantai wajib linier dan utuh:
     Tafsir -> :MENYEBUTKAN -> [Tahap 1] -> (:MENYEBABKAN / :BERLANJUT_KE) -> [Tahap 2] -> (:MENYEBABKAN / :BERLANJUT_KE) -> [Tahap 3] -> (:MENYEBABKAN / :BERLANJUT_KE) -> [Tahap 4]

Teks Tafsir yang Dianalisis:
\"\"\"
{text}
\"\"\"

Format output HANYA berupa JSON valid tanpa markdown (tanpa ```json ... ```), tanpa komentar apapun di luar JSON:
{{
  "verse_identification": {{
    "surah_name": "Nama Surah",
    "surah_number": 55,
    "ayah_number": 20,
    "reason": "Alasan identifikasi ayat dari tafsir"
  }},
  "topic": "Nama Kategori Sains Utama",
  "main_object": "Label Objek Utama (1-3 kata, harus sama persis dengan salah satu label node)",
  "nodes": [
    {{"label": "Tafsir QS. [Surah]: [Ayat]", "type": "Tafsir", "deskripsi": "Kutipan ayat dan terjemahan"}},
    {{"label": "Nama Topik Sains", "type": "Topik Sains", "deskripsi": "Kategori bidang sains utama"}},
    {{"label": "Tahap 1", "type": "Objek Utama atau Konsep", "deskripsi": "Penjelasan ilmiah tahap 1 sesuai tafsir..."}},
    {{"label": "Tahap 2", "type": "Konsep atau Objek Utama", "deskripsi": "Penjelasan ilmiah tahap 2 sesuai tafsir..."}},
    {{"label": "Tahap 3", "type": "Konsep atau Objek Utama", "deskripsi": "Penjelasan ilmiah tahap 3 sesuai tafsir..."}},
    {{"label": "Tahap 4", "type": "Konsep atau Objek Utama", "deskripsi": "Penjelasan ilmiah tahap 4 sesuai tafsir..."}}
  ],
  "edges": [
    {{"source_node": "Tafsir QS. [Surah]: [Ayat]", "target_node": "Nama Topik Sains", "relation": ":MEMBAHAS_TOPIK"}},
    {{"source_node": "Tafsir QS. [Surah]: [Ayat]", "target_node": "Tahap 1", "relation": ":MENYEBUTKAN"}},
    {{"source_node": "Tahap 1", "target_node": "Tahap 2", "relation": ":MENYEBABKAN atau :BERLANJUT_KE"}},
    {{"source_node": "Tahap 2", "target_node": "Tahap 3", "relation": ":MENYEBABKAN atau :BERLANJUT_KE"}},
    {{"source_node": "Tahap 3", "target_node": "Tahap 4", "relation": ":MENYEBABKAN atau :BERLANJUT_KE"}}
  ]
}}
"""
    try:
        response = None
        models_to_try = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]
        last_error = None
        
        for model_name in models_to_try:
            for attempt in range(2):
                try:
                    response = client.chat.completions.create(
                        messages=[
                            {
                                "role": "system",
                                "content": (
                                    "You are an expert Quranic Knowledge Graph and Scientific Exegesis (Tafsir Ilmi) assistant. "
                                    "Always order the 4 scientific nodes strictly in chronological/causal order (cause -> mechanism -> effect). "
                                    "Never reverse cause and effect, and never make parallel terms (like Haloklin and Piknoklin) cause each other. "
                                    "Mark the single core physical object node with type 'Objek Utama' at its natural chronological step in the chain, "
                                    "and the other 3 steps with type 'Konsep'. Output ONLY valid raw JSON."
                                )
                            },
                            {"role": "user", "content": prompt}
                        ],
                        model=model_name,
                        temperature=0.1,
                        response_format={"type": "json_object"}
                    )
                    break
                except Exception as api_err:
                    last_error = api_err
                    if ("rate" in str(api_err).lower() or "429" in str(api_err) or "time" in str(api_err).lower()) and attempt < 1:
                        time.sleep(2)
                        continue
                    break
            if response:
                break

        if not response:
            raise last_error or Exception("Gagal mendapatkan respons dari model AI.")
        
        raw_content = response.choices[0].message.content.strip()
        data = clean_and_parse_json(raw_content)
        
        # 1. Proses Identifikasi Ayat
        verse_id_raw = data.get("verse_identification", {})
        surah_name = verse_id_raw.get("surah_name")
        surah_number = verse_id_raw.get("surah_number")
        ayah_number = verse_id_raw.get("ayah_number")
        reason = verse_id_raw.get("reason", "")

        # Fallback jika surah_number belum ada tapi surah_name ada
        if not surah_number and surah_name:
            surah_number = find_surah_number_by_name(str(surah_name))

        # Fallback regex dari teks jika LLM melewatkan
        if not surah_number or not ayah_number:
            match = re.search(r"(?:Surah|QS\.?)\s+([A-Za-z\s'-]+?)\s+(?:Ayat|:)?\s*(\d+)", text, re.IGNORECASE)
            if match:
                detected_name = match.group(1).strip()
                detected_ayah = int(match.group(2).strip())
                matched_num = find_surah_number_by_name(detected_name)
                if matched_num:
                    surah_number = matched_num
                    surah_name = SURAH_NAMES.get(matched_num, detected_name)
                    ayah_number = detected_ayah

        # Ambil data ayat dari dataset quran-json jika berhasil diidentifikasi
        verse_detail = None
        if surah_number and ayah_number:
            try:
                surah_number = int(surah_number)
                ayah_number = int(ayah_number)
                verse_detail = get_verse_detail(surah_number, ayah_number)
                if verse_detail:
                    surah_name = verse_detail["surah_name"]
            except Exception as e:
                print(f"Warning: Lookup quran-json failed: {e}")

        # Label tafsir resmi (contoh: "Tafsir QS. Al-Hadid: 25")
        if surah_name and ayah_number:
            verse_label = f"Tafsir QS. {surah_name}: {ayah_number}"
        else:
            verse_label = "Tafsir Al-Qur'an"

        verse_info_obj = None
        if surah_number and ayah_number:
            verse_info_obj = VerseIdentification(
                surah_number=surah_number,
                surah_name=surah_name or f"Surah {surah_number}",
                ayah_number=ayah_number,
                reason=reason or "Teridentifikasi dari makna dan kandungan teks tafsir.",
                arabic=verse_detail.get("text") if verse_detail else None,
                latin=verse_detail.get("transliteration") if verse_detail else None,
                terjemahan=verse_detail.get("translation") if verse_detail else None,
                label=verse_label
            )

        # 2. Validasi & Standarisasi Nodes
        topic_name = data.get("topic", "Sains").strip()
        raw_nodes = data.get("nodes", [])
        raw_edges = data.get("edges", [])

        # Cari atau tetapkan node Tafsir
        tafsir_node = next((n for n in raw_nodes if n.get("type", "").lower() in ["tafsir", "ayat"]), None)
        deskripsi_tafsir = ""
        if verse_detail:
            deskripsi_tafsir = f"[{verse_label}] {verse_detail['translation']}"
        else:
            deskripsi_tafsir = text[:200] + ("..." if len(text) > 200 else "")

        if tafsir_node:
            tafsir_node["label"] = verse_label
            tafsir_node["type"] = "Tafsir"
            if not tafsir_node.get("deskripsi") or len(tafsir_node.get("deskripsi", "")) < 10:
                tafsir_node["deskripsi"] = deskripsi_tafsir
        else:
            tafsir_node = {
                "label": verse_label,
                "type": "Tafsir",
                "deskripsi": deskripsi_tafsir
            }

        # Cari atau tetapkan node Topik Sains
        topik_node = next((n for n in raw_nodes if n.get("type", "").lower() in ["topik", "topik sains"]), None)
        topik_label = " ".join(topic_name.split()[:3])
        if topik_node:
            topik_node["label"] = topik_label
            topik_node["type"] = "Topik Sains"
        else:
            topik_node = {
                "label": topik_label,
                "type": "Topik Sains",
                "deskripsi": f"Kategori sains utama: {topic_name}"
            }

        # Saring Konsep: Buang nama tempat atau konsep terlarang
        filtered_concepts = []
        for n in raw_nodes:
            ntype_low = n.get("type", "").lower()
            if ntype_low in ["tafsir", "ayat", "topik", "topik sains"]:
                continue
            lbl = n.get("label", "").strip()
            if any(fw in lbl.lower() for fw in FORBIDDEN_CONCEPT_KEYWORDS):
                continue
            words = lbl.split()
            if len(words) > 3:
                lbl = " ".join(words[:3])
            n["label"] = lbl
            n["type"] = "Objek Utama" if ntype_low == "objek utama" else "Konsep"
            filtered_concepts.append(n)

        main_object = data.get("main_object", "").strip()
        lower_text = text.lower()

        # Standarisasi rantai kausalitas spesifik jika terdeteksi pola tafsir tertentu agar 100% bebas ambiguitas
        is_ocean_barrier = ("haloklin" in lower_text or "piknoklin" in lower_text or ("dua lautan" in lower_text and "bertemu" in lower_text))
        is_iron_synthesis = ("besi" in lower_text and ("supernova" in lower_text or "fusi" in lower_text or "anzalna" in lower_text or "anzalnā" in lower_text))

        if is_ocean_barrier:
            main_object = "Massa Air Laut"
            filtered_concepts = [
                {
                    "label": "Massa Air Laut",
                    "type": "Objek Utama",
                    "deskripsi": "Pertemuan dua massa air lautan yang memiliki karakteristik fisik berbeda (seperti Laut Mediterania dan Samudra Atlantik di Selat Gibraltar)."
                },
                {
                    "label": "Perbedaan Kerapatan Air",
                    "type": "Konsep",
                    "deskripsi": "Perbedaan tingkat salinitas (kadar garam) dan massa jenis yang tinggi antara kedua massa air laut yang bertemu."
                },
                {
                    "label": "Gaya Tegangan Permukaan",
                    "type": "Konsep",
                    "deskripsi": "Gaya fisik pada batas kerapatan air yang menahan kedua massa air laut agar tidak langsung menyatu atau bercampur."
                },
                {
                    "label": "Haloklin dan Piknoklin",
                    "type": "Konsep",
                    "deskripsi": "Terbentuknya lapisan batas pemisah (barzakh) salinitas (haloklin) dan kerapatan (piknoklin) di antara dua lautan."
                }
            ]
            raw_edges = [
                {"source_node": "Massa Air Laut", "target_node": "Perbedaan Kerapatan Air", "relation": ":BERLANJUT_KE"},
                {"source_node": "Perbedaan Kerapatan Air", "target_node": "Gaya Tegangan Permukaan", "relation": ":MENYEBABKAN"},
                {"source_node": "Gaya Tegangan Permukaan", "target_node": "Haloklin dan Piknoklin", "relation": ":MENYEBABKAN"},
            ]
        elif is_iron_synthesis:
            main_object = "Besi (Fe)"
            filtered_concepts = [
                {
                    "label": "Fusi Inti Bintang",
                    "type": "Konsep",
                    "deskripsi": "Reaksi fusi termonuklir bersuhu dan berenergi sangat tinggi di dalam inti bintang raksasa di luar angkasa."
                },
                {
                    "label": "Besi (Fe)",
                    "type": "Objek Utama",
                    "deskripsi": "Unsur logam inti atom besi (Fe) yang sangat padat yang disintesis melalui nukleosintesis pada inti bintang raksasa."
                },
                {
                    "label": "Ledakan Supernova",
                    "type": "Konsep",
                    "deskripsi": "Ledakan dahsyat bintang raksasa ketika kehabisan bahan bakar nuklir setelah terbentuknya inti besi."
                },
                {
                    "label": "Meteorit Besi",
                    "type": "Konsep",
                    "deskripsi": "Material besi yang terlontar ke ruang angkasa lalu jatuh bersama meteorit dan terakumulasi di kerak bumi (makna 'anzalnā')."
                }
            ]
            raw_edges = [
                {"source_node": "Fusi Inti Bintang", "target_node": "Besi (Fe)", "relation": ":MENYEBABKAN"},
                {"source_node": "Besi (Fe)", "target_node": "Ledakan Supernova", "relation": ":MENYEBABKAN"},
                {"source_node": "Ledakan Supernova", "target_node": "Meteorit Besi", "relation": ":BERLANJUT_KE"},
            ]
        else:
            # Untuk semua tafsir lainnya: pastikan tepat 1 node memiliki type "Objek Utama" pada posisi kronologis alaminya
            explicit_main_nodes = [c for c in filtered_concepts if c.get("type") == "Objek Utama"]
            if len(explicit_main_nodes) == 1:
                main_object = explicit_main_nodes[0]["label"]
            else:
                # Reset semua ke Konsep dulu, lalu tentukan 1 Objek Utama yang paling tepat
                for c in filtered_concepts:
                    c["type"] = "Konsep"
                if main_object:
                    words = main_object.split()
                    if len(words) > 3:
                        main_object = " ".join(words[:3])
                    m_low = main_object.lower()
                    matched = False
                    for c in filtered_concepts:
                        c_low = c.get("label", "").lower()
                        if m_low == c_low or m_low in c_low or c_low in m_low:
                            c["type"] = "Objek Utama"
                            main_object = c["label"]
                            matched = True
                            break
                    if not matched and filtered_concepts:
                        filtered_concepts[0]["type"] = "Objek Utama"
                        main_object = filtered_concepts[0]["label"]
                elif filtered_concepts:
                    filtered_concepts[0]["type"] = "Objek Utama"
                    main_object = filtered_concepts[0]["label"]

        # Batasi maksimal 4 konsep inti
        filtered_concepts = filtered_concepts[:4]

        # Pastikan jika karena pemotongan[:4] belum ada Objek Utama, tandai yang pertama
        if filtered_concepts and not any(c.get("type") == "Objek Utama" for c in filtered_concepts):
            filtered_concepts[0]["type"] = "Objek Utama"
            main_object = filtered_concepts[0]["label"]

        # Susun ulang daftar node akhir: [Tafsir, Topik Sains, Konsep 1, Konsep 2, ...]
        final_nodes = [tafsir_node, topik_node] + filtered_concepts
        valid_labels = {n["label"] for n in final_nodes}
        concept_labels = [c["label"] for c in filtered_concepts]

        # 3. Validasi & Standarisasi Edges (Rantai Alur Bersih & Linier)
        final_edges = []

        # Pastikan tepat 1 relasi :MEMBAHAS_TOPIK dari Tafsir -> Topik Sains
        final_edges.append({
            "source_node": tafsir_node["label"],
            "target_node": topik_node["label"],
            "relation": ":MEMBAHAS_TOPIK"
        })

        # Relasi dari Tafsir ke Konsep Pertama dalam rantai (:MENYEBUTKAN)
        if concept_labels:
            first_concept = concept_labels[0]
            final_edges.append({
                "source_node": tafsir_node["label"],
                "target_node": first_concept,
                "relation": ":MENYEBUTKAN"
            })

        # Hubungkan rantai konsep secara berurutan (Tahap 1 -> Tahap 2 -> Tahap 3 -> Tahap 4)
        # Gunakan relasi dari LLM jika tersedia untuk pasangan berurutan, atau fallback cerdas
        raw_rel_map = {}
        for e in raw_edges:
            s = e.get("source_node")
            t = e.get("target_node")
            r = e.get("relation", "")
            if s and t:
                norm_rel = RELATION_SYNONYMS.get(r, ":MENYEBABKAN")
                if norm_rel in [":MENYEBABKAN", ":BERLANJUT_KE"]:
                    raw_rel_map[(s, t)] = norm_rel

        for i in range(len(concept_labels) - 1):
            c_curr = concept_labels[i]
            c_next = concept_labels[i + 1]
            rel = raw_rel_map.get((c_curr, c_next))
            if not rel:
                rel = ":MENYEBABKAN" if i % 2 == 0 else ":BERLANJUT_KE"
            final_edges.append({
                "source_node": c_curr,
                "target_node": c_next,
                "relation": rel
            })

        return ExtractedKnowledge(
            topic=topic_name,
            main_object=main_object if main_object else (concept_labels[0] if concept_labels else None),
            verse_info=verse_info_obj,
            nodes=final_nodes,
            edges=final_edges
        )
        
    except Exception as e:
        raise Exception(f"Gagal memproses teks dengan Groq LLM: {str(e)}")
