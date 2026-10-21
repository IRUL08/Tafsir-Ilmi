from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings

app = FastAPI(
    title="Tafsir AI Knowledge Graph API",
    description="API untuk memproses teks tafsir menjadi Knowledge Graph menggunakan LLM.",
    version="1.0.0"
)

# Konfigurasi CORS agar Frontend (Next.js) bisa memanggil API ini
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Dalam produksi, ganti dengan URL Frontend Anda
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Selamat datang di API Tafsir Knowledge Graph", "status": "running"}

from models import ProcessTafsirRequest
from groq_service import extract_knowledge_graph
from db_service import save_to_supabase
from quran_service import get_verse_detail
from fastapi import HTTPException

@app.post("/api/process-tafsir")
async def process_tafsir(request: ProcessTafsirRequest):
    try:
        # 1. Ekstrak entitas & relasi dengan Groq LLM (termasuk deteksi ayat otomatis)
        extracted_data = extract_knowledge_graph(request.content)
        
        # 2. Tentukan source secara cerdas jika tidak diisi user
        source = request.source
        if not source or not source.strip():
            if extracted_data.verse_info and extracted_data.verse_info.label:
                source = f"{extracted_data.verse_info.label} (Tafsir Ilmi)"
            else:
                source = "Tafsir Ilmi Fenomena Alam"

        # 3. Simpan hasil ke Supabase
        result = save_to_supabase(
            text=request.content, 
            source=source, 
            data=extracted_data
        )
        
        return {
            "message": "Tafsir berhasil diproses",
            "data": result,
            "main_object": extracted_data.main_object,
            "graph": extracted_data.model_dump(),
            "verse_info": extracted_data.verse_info.model_dump() if extracted_data.verse_info else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from reprocess_tafsir import reprocess_single_tafsir

@app.post("/api/reprocess-tafsir/{tafsir_id}")
async def reprocess_tafsir_endpoint(tafsir_id: str):
    try:
        success = reprocess_single_tafsir(tafsir_id)
        if not success:
            raise HTTPException(status_code=404, detail="Tafsir tidak ditemukan")
        return {"message": "Tafsir berhasil direproses dengan 3 aturan wajib sistem", "tafsir_id": tafsir_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/quran/{surah_id}/{ayat_id}")
def get_quran_verse(surah_id: int, ayat_id: int):
    verse = get_verse_detail(surah_id, ayat_id)
    if not verse:
        raise HTTPException(status_code=404, detail="Ayat tidak ditemukan di dataset quran-json")
        
    return {
        "surah_name": verse["surah_name"],
        "surah_number": verse["surah_number"],
        "ayat_number": verse["ayah_number"],
        "arab": verse["text"],
        "transliterasi": verse["transliteration"],
        "terjemahan": verse["translation"]
    }
