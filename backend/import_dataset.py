# -*- coding: utf-8 -*-
"""
Script Import Dataset Quran-JSON (Terjemahan Kemenag RI)
=========================================================
Script ini membaca dataset 'risan/quran-json', memfilter ayat-ayat Al-Qur'an
yang berkaitan dengan fenomena alam, lalu memprosesnya via AI (Groq) untuk
mengekstrak Knowledge Graph dan menyimpannya ke Supabase.

Cara menjalankan (dari folder backend/):
    python import_dataset.py
"""

import json
import os
import time
import sys

# Konfigurasi encoding UTF-8 untuk output terminal Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Tambahkan path backend agar bisa mengimpor modul lokal
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from groq_service import extract_knowledge_graph
from db_service import save_to_supabase

# ============================================================
# KONFIGURASI: Daftar ayat yang berkaitan dengan FENOMENA ALAM
# Format: { nomor_surah: [ayat1, ayat2, ...] }
# LLM-lah yang akan MENGELOMPOKKAN & MENGEKSTRAK Knowledge Graph!
# ============================================================
AYAT_FENOMENA_ALAM = {
    2:  [19, 22, 164],       # Al-Baqarah: Kilat, Hujan, Siklus Hidrologi
    13: [12, 13, 17],        # Ar-Ra'd:    Petir, Guruh, Banjir
    15: [22],                # Al-Hijr:    Angin
    16: [65],                # An-Nahl:    Hujan menghidupkan bumi
    24: [43],                # An-Nur:     Awan, Hujan, Es, Kilat
    25: [48, 49],            # Al-Furqan:  Angin pembawa hujan
    30: [48],                # Ar-Rum:     Angin dan Hujan
    35: [9],                 # Fatir:      Angin membawa awan
    36: [34],                # Yasin:      Air menumbuhkan buah
    39: [21],                # Az-Zumar:   Siklus Air dari langit
    45: [5],                 # Al-Jatsiyah: Hujan menghidupkan bumi
    50: [9],                 # Qaf:        Air dari langit
    56: [68, 69, 70],        # Al-Waqi'ah: Air yang kita minum
    67: [30],                # Al-Mulk:    Air dari tanah
    71: [11],                # Nuh:        Hujan lebat
    78: [6, 7],              # An-Naba':   Bumi dan gunung
    86: [11],                # At-Tariq:   Langit yang menurunkan hujan
}

# Path ke file quran.json dari repo risan/quran-json
DATASET_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "quran-json", "data", "kemenag", "quran.json"
)

# Mapping nomor surah ke nama surah (untuk keperluan label)
NAMA_SURAH = {
    1: "Al-Fatihah", 2: "Al-Baqarah", 3: "Ali Imran", 4: "An-Nisa",
    5: "Al-Maidah", 6: "Al-Anam", 7: "Al-Araf", 8: "Al-Anfal",
    9: "At-Taubah", 10: "Yunus", 11: "Hud", 12: "Yusuf",
    13: "Ar-Ra'd", 14: "Ibrahim", 15: "Al-Hijr", 16: "An-Nahl",
    17: "Al-Isra", 18: "Al-Kahf", 19: "Maryam", 20: "Ta Ha",
    21: "Al-Anbiya", 22: "Al-Hajj", 23: "Al-Mu'minun", 24: "An-Nur",
    25: "Al-Furqan", 26: "Asy-Syu'ara", 27: "An-Naml", 28: "Al-Qasas",
    29: "Al-Ankabut", 30: "Ar-Rum", 31: "Luqman", 32: "As-Sajdah",
    33: "Al-Ahzab", 34: "Saba", 35: "Fatir", 36: "Yasin",
    37: "As-Saffat", 38: "Sad", 39: "Az-Zumar", 40: "Gafir",
    41: "Fussilat", 42: "Asy-Syura", 43: "Az-Zukhruf", 44: "Ad-Dukhan",
    45: "Al-Jasiyah", 46: "Al-Ahqaf", 47: "Muhammad", 48: "Al-Fath",
    49: "Al-Hujurat", 50: "Qaf", 51: "Az-Zariyat", 52: "At-Tur",
    53: "An-Najm", 54: "Al-Qamar", 55: "Ar-Rahman", 56: "Al-Waqi'ah",
    67: "Al-Mulk", 71: "Nuh", 77: "Al-Mursalat", 78: "An-Naba",
    86: "At-Tariq",
}


def load_dataset() -> dict:
    """Memuat seluruh file quran.json ke memori."""
    print(f"[*] Memuat dataset dari: {DATASET_FILE}")
    if not os.path.exists(DATASET_FILE):
        raise FileNotFoundError(
            f"File dataset tidak ditemukan: {DATASET_FILE}\n"
            "Pastikan repo 'quran-json' sudah di-clone di folder capstone-tafsir!"
        )
    with open(DATASET_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def get_verse(quran_data: dict, surah_num: int, ayat_num: int) -> dict | None:
    """Mengambil satu ayat dari data quran."""
    surah_key = str(surah_num)
    surah_verses = quran_data.get(surah_key, [])
    for verse in surah_verses:
        if verse.get("verse") == ayat_num:
            return verse
    return None


def build_tafsir_text(verse: dict, surah_num: int) -> str:
    """Membangun teks lengkap dari data ayat untuk dikirim ke LLM."""
    surah_name = NAMA_SURAH.get(surah_num, f"Surah {surah_num}")
    arabic = verse.get("text", "")
    translation = verse.get("translation", "")
    footnotes = verse.get("footnotes", "")
    ayat_num = verse.get("verse", "?")

    text = (
        f"Surah {surah_name} Ayat {ayat_num}.\n"
        f"Teks Arab: {arabic}\n"
        f"Terjemahan (Kemenag RI): {translation}"
    )
    if footnotes:
        text += f"\nCatatan Kaki: {footnotes}"
    return text


def main():
    print("=" * 60)
    print("  IMPORT: Ayat Fenomena Alam Al-Qur'an ke Supabase")
    print("  (via AI Groq untuk Klasifikasi & Ekstraksi KG)")
    print("=" * 60)

    # Muat dataset sekali saja
    try:
        quran_data = load_dataset()
        print(f"[✓] Dataset berhasil dimuat.")
    except FileNotFoundError as e:
        print(f"[✗] ERROR: {e}")
        return

    total_ayat = sum(len(v) for v in AYAT_FENOMENA_ALAM.values())
    processed = 0
    success = 0
    failed = 0

    for surah_num, list_ayat in AYAT_FENOMENA_ALAM.items():
        surah_name = NAMA_SURAH.get(surah_num, f"Surah {surah_num}")
        print(f"\n[Surah {surah_num}: {surah_name}]")

        for ayat_num in list_ayat:
            processed += 1
            print(f"\n  [{processed}/{total_ayat}] Memproses Ayat {ayat_num}...")

            # 1. Ambil ayat dari dataset
            verse = get_verse(quran_data, surah_num, ayat_num)
            if not verse:
                print(f"    [!] Ayat {ayat_num} tidak ditemukan, skip.")
                failed += 1
                continue

            tafsir_text = build_tafsir_text(verse, surah_num)
            print(f"    Teks: {tafsir_text[:80]}...")

            try:
                # 2. Kirim ke AI Groq => LLM mengelompokkan & membuat KG
                print(f"    -> Mengirim ke Groq LLM...")
                extracted = extract_knowledge_graph(tafsir_text)
                print(f"    -> Topik AI: '{extracted.topic}'")
                print(f"    -> Node: {len(extracted.nodes)}, Edge: {len(extracted.edges)}")

                # 3. Simpan hasil ke Supabase
                print(f"    -> Menyimpan ke Supabase...")
                result = save_to_supabase(
                    text=tafsir_text,
                    source=f"Al-Qur'an Terjemahan Kemenag RI - {surah_name}:{ayat_num}",
                    data=extracted
                )
                print(f"    ✅ BERHASIL! Tafsir ID: {result['tafsir_id']}")
                success += 1

            except Exception as e:
                print(f"    ❌ GAGAL: {e}")
                failed += 1

            # Jeda agar tidak melebihi rate limit Groq API (30 req/min)
            if processed < total_ayat:
                time.sleep(1.5)

    print("\n" + "=" * 60)
    print(f"  SELESAI! ✅ Berhasil: {success} | ❌ Gagal: {failed} | Total: {total_ayat}")
    print("=" * 60)


if __name__ == "__main__":
    main()
