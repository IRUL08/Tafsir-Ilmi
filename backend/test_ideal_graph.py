# -*- coding: utf-8 -*-
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'backend')
from groq import Groq
from config import settings

client = Groq(api_key=settings.GROQ_API_KEY)
sample = (
    "Dia membiarkan dua lautan mengalir yang kemudian keduanya bertemu, tetapi di antara keduanya ada batas pemisah "
    "yang tidak dapat dilampaui oleh masing-masing. Kajian oseanografi modern membuktikan adanya fenomena haloklin di "
    "Selat Gibraltar, di mana air Laut Mediterania yang berkadar garam tinggi dan air Samudra Atlantik yang lebih tawar "
    "bertemu namun tidak langsung bercampur karena perbedaan densitas dan massa jenis air."
)

prompt = f"""
Anda adalah pakar Knowledge Graph untuk Tafsir Al-Qur'an dan Sains (Tafsir Ilmi).
Tugas Anda adalah membuat Knowledge Graph yang BERSIH, EFEKTIF, dan IDEAL.

ATURAN EMAS KNOWLEDGE GRAPH IDEAL:
1. Identifikasi Ayat Al-Qur'an:
   - Tentukan "surah_name", "surah_number", "ayah_number", dan "reason".

2. Topik Sains & Objek Utama:
   - Tepat 1 kategori sains utama (misal: "Oseanografi").
   - Tentukan "main_object": Objek materi/fenomena utama yang dibahas (misal: "Air Laut", "Besi", "Hujan", "Janin").

3. Ekstrak Node Konsep Sains (HANYA 3 SAMPAI 4 KONSEP INTI):
   - 1 Node Ayat: label "QS. [NamaSurah]: [NomorAyat]", tipe "Ayat".
   - 1 Node Topik Sains: label nama bidang sains, tipe "Topik Sains".
   - TEPAT 3 SAMPAI 4 Node Konsep Sains Fisik Inti: tipe "Konsep".
   * ATURAN KETAT OBJEK UTAMA & KONSEP:
     - OBJEK UTAMA WAJIB MENJADI SALAH SATU NODE KONSEP (misal Air Laut, Besi, Hujan, Janin), dan WAJIB menjadi Konsep Pertama yang dihubungkan langsung dari Ayat dengan relasi :MENYEBUTKAN!
     - DILARANG membuat node untuk nama tempat/geografis (seperti "Atlantik", "Mediterania", "Gibraltar")! Masukkan informasi tempat ke dalam 'deskripsi' konsep.
     - DILARANG membuat node untuk kata umum/redundant jika sudah ada konsep fisik khususnya.
     - Label node ringkas: 1 - 3 kata.

4. Struktur Relasi Rantai Kausalitas Ilmiah (HANYA 4 Relasi):
   - :MEMBAHAS_TOPIK (Ayat -> Topik Sains)
   - :MENYEBUTKAN (Ayat -> Objek Utama Tafsir / Konsep Pertama)
   - :MENYEBABKAN (Konsep -> Konsep berikutnya untuk sebab-akibat fisik)
   - :BERLANJUT_KE (Konsep -> Konsep berikutnya untuk urutan tahapan proses)
   * ATURAN KETAT RELASI:
     - DILARANG menarik relasi :MENYEBUTKAN dari Ayat ke semua konsep! Ayat HANYA menghubungkan objek utama (konsep pertama).
     - Konsep-konsep ilmiah harus saling terhubung membentuk RANTAI ALUR SEBAB-AKIBAT:
       Ayat -> :MENYEBUTKAN -> [Objek Utama] -> :MENYEBABKAN/:BERLANJUT_KE -> [Konsep 2] -> :MENYEBABKAN/:BERLANJUT_KE -> [Konsep 3]

Teks Tafsir:
\"\"\"
{sample}
\"\"\"

Format output HANYA JSON:
{{
  "verse_identification": {{
    "surah_name": "Ar-Rahman",
    "surah_number": 55,
    "ayah_number": 19,
    "reason": "..."
  }},
  "topic": "Oseanografi",
  "main_object": "Air Laut",
  "nodes": [
    {{"label": "QS. Ar-Rahman: 19", "type": "Ayat", "deskripsi": "..."}},
    {{"label": "Oseanografi", "type": "Topik Sains", "deskripsi": "..."}},
    {{"label": "Air Laut", "type": "Konsep", "deskripsi": "Objek utama perairan laut yang dibahas dalam ayat..."}},
    {{"label": "Salinitas Air", "type": "Konsep", "deskripsi": "..."}},
    {{"label": "Lapisan Haloklin", "type": "Konsep", "deskripsi": "..."}}
  ],
  "edges": [
    {{"source_node": "QS. Ar-Rahman: 19", "target_node": "Oseanografi", "relation": ":MEMBAHAS_TOPIK"}},
    {{"source_node": "QS. Ar-Rahman: 19", "target_node": "Air Laut", "relation": ":MENYEBUTKAN"}},
    {{"source_node": "Air Laut", "target_node": "Salinitas Air", "relation": ":MENYEBABKAN"}},
    {{"source_node": "Salinitas Air", "target_node": "Lapisan Haloklin", "relation": ":BERLANJUT_KE"}}
  ]
}}
"""

resp = client.chat.completions.create(
    model="openai/gpt-oss-120b",
    messages=[{"role": "user", "content": prompt}],
    temperature=0.1
)
print(resp.choices[0].message.content)
