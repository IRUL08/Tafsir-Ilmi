# -*- coding: utf-8 -*-
"""
Quran Service: Helper untuk pencarian dan pemuatan dataset quran-json (Kemenag RI)
"""
import json
import os
import re
from pathlib import Path
from typing import Optional, Dict, Any

DATASET_PATH = Path(__file__).parent.parent / "quran-json" / "data" / "kemenag" / "quran.json"

SURAH_NAMES = {
    1: "Al-Fatihah", 2: "Al-Baqarah", 3: "Ali 'Imran", 4: "An-Nisa'", 5: "Al-Ma'idah",
    6: "Al-An'am", 7: "Al-A'raf", 8: "Al-Anfal", 9: "At-Taubah", 10: "Yunus",
    11: "Hud", 12: "Yusuf", 13: "Ar-Ra'd", 14: "Ibrahim", 15: "Al-Hijr",
    16: "An-Nahl", 17: "Al-Isra'", 18: "Al-Kahf", 19: "Maryam", 20: "Ta Ha",
    21: "Al-Anbiya'", 22: "Al-Hajj", 23: "Al-Mu'minun", 24: "An-Nur", 25: "Al-Furqan",
    26: "Asy-Syu'ara'", 27: "An-Naml", 28: "Al-Qasas", 29: "Al-'Ankabut", 30: "Ar-Rum",
    31: "Luqman", 32: "As-Sajdah", 33: "Al-Ahzab", 34: "Saba'", 35: "Fatir",
    36: "Yasin", 37: "As-Saffat", 38: "Sad", 39: "Az-Zumar", 40: "Gafir",
    41: "Fussilat", 42: "Asy-Syura", 43: "Az-Zukhruf", 44: "Ad-Dukhan", 45: "Al-Jasiyah",
    46: "Al-Ahqaf", 47: "Muhammad", 48: "Al-Fath", 49: "Al-Hujurat", 50: "Qaf",
    51: "Az-Zariyat", 52: "At-Tur", 53: "An-Najm", 54: "Al-Qamar", 55: "Ar-Rahman",
    56: "Al-Waqi'ah", 57: "Al-Hadid", 58: "Al-Mujadalah", 59: "Al-Hasyr", 60: "Al-Mumtahanah",
    61: "As-Saff", 62: "Al-Jumu'ah", 63: "Al-Munafiqun", 64: "At-Tagabun", 65: "At-Talaq",
    66: "At-Tahrim", 67: "Al-Mulk", 68: "Al-Qalam", 69: "Al-Haqqah", 70: "Al-Ma'arij",
    71: "Nuh", 72: "Al-Jinn", 73: "Al-Muzzammil", 74: "Al-Muddassir", 75: "Al-Qiyamah",
    76: "Al-Insan", 77: "Al-Mursalat", 78: "An-Naba'", 79: "An-Nazi'at", 80: "'Abasa",
    81: "At-Takwir", 82: "Al-Infitar", 83: "Al-Mutaffifin", 84: "Al-Insyiqaq", 85: "Al-Buruj",
    86: "At-Tariq", 87: "Al-A'la", 88: "Al-Gasyiyah", 89: "Al-Fajr", 90: "Al-Balad",
    91: "Asy-Syams", 92: "Al-Lail", 93: "Ad-Duha", 94: "Asy-Syarh", 95: "At-Tin",
    96: "Al-'Alaq", 97: "Al-Qadr", 98: "Al-Bayyinah", 99: "Az-Zalzalah", 100: "Al-'Adiyat",
    101: "Al-Qari'ah", 102: "At-Takasur", 103: "Al-'Asr", 104: "Al-Humazah", 105: "Al-Fil",
    106: "Quraisy", 107: "Al-Ma'un", 108: "Al-Kausar", 109: "Al-Kafirun", 110: "An-Nasr",
    111: "Al-Lahab", 112: "Al-Ikhlas", 113: "Al-Falaq", 114: "An-Nas"
}

# Cache dataset
_QURAN_DATA: Optional[Dict[str, Any]] = None

def load_quran_dataset() -> Dict[str, Any]:
    global _QURAN_DATA
    if _QURAN_DATA is not None:
        return _QURAN_DATA
    if DATASET_PATH.exists():
        with open(DATASET_PATH, "r", encoding="utf-8") as f:
            _QURAN_DATA = json.load(f)
            return _QURAN_DATA
    return {}

def normalize_text(text: str) -> str:
    """Normalisasi string untuk pencocokan nama surah."""
    return re.sub(r"[^a-z0-9]", "", text.lower())

def find_surah_number_by_name(name: str) -> Optional[int]:
    """Mencari nomor surah berdasarkan nama surah yang fleksibel."""
    if not name:
        return None
    norm_input = normalize_text(name)
    for num, s_name in SURAH_NAMES.items():
        if norm_input == normalize_text(s_name):
            return num
    # Partial matching (misal 'nur' cocok dengan 'annur')
    for num, s_name in SURAH_NAMES.items():
        norm_s = normalize_text(s_name)
        if norm_input in norm_s or norm_s in norm_input:
            return num
    return None

def get_verse_detail(surah_num: int, ayah_num: int) -> Optional[Dict[str, Any]]:
    """Mengambil ayat spesifik dari dataset quran-json."""
    data = load_quran_dataset()
    surah_verses = data.get(str(surah_num), [])
    for v in surah_verses:
        if v.get("verse") == ayah_num:
            return {
                "surah_number": surah_num,
                "surah_name": SURAH_NAMES.get(surah_num, f"Surah {surah_num}"),
                "ayah_number": ayah_num,
                "text": v.get("text", ""),
                "transliteration": v.get("transliteration", ""),
                "translation": v.get("translation", ""),
                "footnotes": v.get("footnotes", "")
            }
    return None
