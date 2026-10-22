"""Test pipeline lengkap dengan validasi 3 aturan wajib sistem"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'backend')
from config import settings, supabase
from groq_service import extract_knowledge_graph
from db_service import save_to_supabase
from models import ALLOWED_RELATIONS

print(f"GROQ KEY: {settings.GROQ_API_KEY[:20]}...")
print(f"SUPABASE URL: {settings.SUPABASE_URL[:30]}...")
print(f"Supabase OK: {settings.is_supabase_configured}")
print(f"Supabase client: {supabase is not None}")
print()

# Test dengan teks tafsir ilmi
test_text = """Surah Ar-Ra'd Ayat 12.
Teks Arab: هُوَ الَّذِيْ يُرِيْكُمُ الْبَرْقَ
Terjemahan (Kemenag RI): Dialah yang memperlihatkan kilat kepadamu yang menimbulkan ketakutan dan harapan, dan Dia membentuk awan mendung.
Tafsir Ilmi: Proses pembentukan awan badai (kumulonimbus) menyebabkan gesekan antar partikel air dan es, yang memicu loncatan muatan listrik statis berupa kilat. Kilat tersebut kemudian menyebabkan pemanasan udara secara mendadak yang menghasilkan gelombang suara guruh."""

print("Mengirim ke Groq AI...")
try:
    result = extract_knowledge_graph(test_text)
    print("=" * 60)
    print(f"[ATURAN 1] Topik Sains Utama: {result.topic}")
    print("=" * 60)
    
    print(f"\n[ATURAN OBJEK UTAMA] Objek Utama Tafsir: '{result.main_object}'")
    concept_nodes = [n for n in result.nodes if n.type == "Konsep"]
    has_main_obj_in_concepts = any(
        result.main_object.lower() in n.label.lower() or n.label.lower() in result.main_object.lower() 
        for n in concept_nodes
    ) if result.main_object else False
    print(f"  -> Apakah Objek Utama masuk sebagai node Konsep? {'[YA - SESUAI ATURAN]' if has_main_obj_in_concepts else '[TIDAK!]'}")
    if concept_nodes:
        print(f"  -> Konsep Pertama (Target :MENYEBUTKAN): '{concept_nodes[0].label}'")
    
    print(f"\n[ATURAN 2] Nodes ({len(result.nodes)} entitas):")
    for n in result.nodes:
        word_count = len(n.label.split())
        is_concise = "[OK 1-3 kata]" if word_count <= 3 else "[FAIL >3 kata!]"
        print(f"  - [{n.type}] '{n.label}' {is_concise}")
        print(f"    Deskripsi: {n.deskripsi[:90]}...")
        
    print(f"\n[ATURAN 3] Edges ({len(result.edges)} relasi):")
    all_valid = True
    for e in result.edges:
        is_valid_rel = e.relation in ALLOWED_RELATIONS
        status = "[VALID]" if is_valid_rel else "[INVALID]"
        if not is_valid_rel:
            all_valid = False
        print(f"  - ({e.source_node}) --[{e.relation}]--> ({e.target_node}) {status}")
    
    print(f"\nSemua relasi sesuai 4 jenis wajib? {all_valid}")
    print()
    
    print("Menyimpan ke Supabase...")
    db_result = save_to_supabase(
        text=test_text,
        source="Tafsir Ilmi - Ar-Ra'd:12",
        data=result
    )
    print(f"BERHASIL DISIMPAN KE SUPABASE! {db_result}")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"ERROR: {e}")

