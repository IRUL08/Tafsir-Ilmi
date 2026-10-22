from pydantic import BaseModel, Field, model_validator
from typing import List, Optional

# 4 Jenis relasi wajib yang diizinkan sistem
ALLOWED_RELATIONS = {
    ":MEMBAHAS_TOPIK",
    ":MENYEBUTKAN",
    ":BERLANJUT_KE",
    ":MENYEBABKAN"
}

RELATION_SYNONYMS = {
    ":MEMBAHAS_TOPIK": ":MEMBAHAS_TOPIK",
    "MEMBAHAS_TOPIK": ":MEMBAHAS_TOPIK",
    ":membahas_topik": ":MEMBAHAS_TOPIK",
    "membahas_topik": ":MEMBAHAS_TOPIK",
    "membahas topik": ":MEMBAHAS_TOPIK",

    ":MENYEBUTKAN": ":MENYEBUTKAN",
    "MENYEBUTKAN": ":MENYEBUTKAN",
    ":menyebutkan": ":MENYEBUTKAN",
    "menyebutkan": ":MENYEBUTKAN",

    ":MENJELASKAN": ":MENYEBUTKAN",
    "MENJELASKAN": ":MENYEBUTKAN",
    ":menjelaskan": ":MENYEBUTKAN",
    "menjelaskan": ":MENYEBUTKAN",

    ":BERLANJUT_KE": ":BERLANJUT_KE",
    "BERLANJUT_KE": ":BERLANJUT_KE",
    ":berlanjut_ke": ":BERLANJUT_KE",
    "berlanjut_ke": ":BERLANJUT_KE",
    "berlanjut ke": ":BERLANJUT_KE",

    ":MENYEBABKAN": ":MENYEBABKAN",
    "MENYEBABKAN": ":MENYEBABKAN",
    ":menyebabkan": ":MENYEBABKAN",
    "menyebabkan": ":MENYEBABKAN",
}

class ProcessTafsirRequest(BaseModel):
    content: str = Field(..., description="Teks tafsir panjang yang ingin diproses")
    source: Optional[str] = Field(None, description="Sumber dari teks tafsir (misal: Tafsir Al-Misbah)")

class Node(BaseModel):
    label: str = Field(..., description="Nama entitas (Tafsir QS. ... atau Konsep/Topik 1-3 kata)")
    type: str = Field(default="Konsep", description="Tipe node (Tafsir, Topik Sains, Objek Utama, atau Konsep)")
    deskripsi: Optional[str] = Field(default="", description="Penjelasan panjang atau deskripsi konsep dari tafsir")

    @model_validator(mode="before")
    def clean_node(cls, values):
        if isinstance(values, dict):
            # Dukung key 'description' jika LLM mengembalikan dalam bahasa Inggris
            if "description" in values and not values.get("deskripsi"):
                values["deskripsi"] = values["description"]
            
            raw_label = str(values.get("label", "")).strip()
            node_type = str(values.get("type", "")).strip()
            
            # Jika node bertipe Tafsir atau Ayat (node dalil tafsir)
            is_tafsir_node = (
                node_type.lower() in ["tafsir", "ayat"] or
                raw_label.lower().startswith("tafsir qs") or
                raw_label.lower().startswith("qs.")
            )
            
            if is_tafsir_node:
                values["type"] = "Tafsir"
                if not raw_label.lower().startswith("tafsir"):
                    raw_label = f"Tafsir {raw_label}"
                values["label"] = raw_label
            else:
                # Format label ringkas (Maksimal 1 - 3 kata untuk Konsep, Objek Utama, dan Topik Sains)
                words = raw_label.split()
                if len(words) > 3:
                    raw_label = " ".join(words[:3])
                values["label"] = raw_label
                if node_type.lower() == "objek utama":
                    values["type"] = "Objek Utama"
                elif node_type.lower() in ["topik", "topik sains"]:
                    values["type"] = "Topik Sains"
                else:
                    values["type"] = "Konsep"
            
            if not values.get("deskripsi"):
                values["deskripsi"] = ""
            if not values.get("type"):
                values["type"] = "Konsep"
        return values

class Edge(BaseModel):
    source_node: str = Field(..., description="Label node sumber")
    target_node: str = Field(..., description="Label node tujuan")
    relation: str = Field(..., description="Salah satu dari 4 relasi valid")

    @model_validator(mode="before")
    def normalize_relation(cls, values):
        if isinstance(values, dict):
            raw_rel = str(values.get("relation", "")).strip()
            normalized = RELATION_SYNONYMS.get(raw_rel) or RELATION_SYNONYMS.get(raw_rel.upper())
            if not normalized and raw_rel.startswith(":"):
                normalized = RELATION_SYNONYMS.get(raw_rel[1:])
            
            # Fallback cerdas jika LLM menggunakan variasi kata lain
            if not normalized:
                lower = raw_rel.lower()
                if any(k in lower for k in ["sebab", "cause", "akibat", "menghasilkan"]):
                    normalized = ":MENYEBABKAN"
                elif any(k in lower for k in ["lanjut", "urutan", "setelah", "kemudian", "kronolog", "tahap"]):
                    normalized = ":BERLANJUT_KE"
                elif any(k in lower for k in ["topik", "kategori", "bidang"]):
                    normalized = ":MEMBAHAS_TOPIK"
                else:
                    normalized = ":MENYEBUTKAN"
            values["relation"] = normalized
        return values

class VerseIdentification(BaseModel):
    surah_number: Optional[int] = Field(None, description="Nomor surah 1-114")
    surah_name: Optional[str] = Field(None, description="Nama surah, misal An-Nur")
    ayah_number: Optional[int] = Field(None, description="Nomor ayat yang dibahas")
    reason: Optional[str] = Field(None, description="Alasan identifikasi ayat dari tafsir")
    arabic: Optional[str] = Field(None, description="Teks Arab ayat dari dataset quran-json")
    latin: Optional[str] = Field(None, description="Transliterasi latin ayat dari dataset quran-json")
    terjemahan: Optional[str] = Field(None, description="Terjemahan resmi Kemenag RI dari dataset quran-json")
    label: Optional[str] = Field(None, description="Label ringkas misal 'QS. An-Nur: 43'")

class ExtractedKnowledge(BaseModel):
    topic: str = Field(..., description="1 Kategori Sains Utama")
    main_object: Optional[str] = Field(default=None, description="Objek utama materi/fenomena yang dibahas tafsir (misal Besi, Hujan, Janin)")
    verse_info: Optional[VerseIdentification] = Field(default=None, description="Informasi surah & ayat yang diidentifikasi")
    nodes: List[Node]
    edges: List[Edge]
